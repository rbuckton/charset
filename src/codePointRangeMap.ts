/*!
 *   Copyright 2018 Ron Buckton
 *
 *   Licensed under the Apache License, Version 2.0 (the "License");
 *   you may not use this file except in compliance with the License.
 *   You may obtain a copy of the License at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 *   Unless required by applicable law or agreed to in writing, software
 *   distributed under the License is distributed on an "AS IS" BASIS,
 *   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *   See the License for the specific language governing permissions and
 *   limitations under the License.
 */

export class CodePointRangeMap {
    public static readonly MIN_CODE_POINT = 0;
    public static readonly MAX_CODE_POINT = 0x10ffff;

    private _root: CodePointRange | undefined;
    private _size = 0;
    private _codePointCount = 0;

    /**
     * Creates a new CodePointRangeMap.
     */
    constructor();

    /**
     * Creates a new CodePointRangeMap from an array of code point ranges where each range (in ascending
     * order) is encoded as two elements: the starting code point, and the length of the range.
     */
    constructor(codePointStartLengthArray: ReadonlyArray<number>);
    constructor(codePointStartLengthArray?: ReadonlyArray<number>) {
        if (codePointStartLengthArray) {
            if (codePointStartLengthArray.length % 2 !== 0) throw new TypeError();
            for (let i = 0; i < codePointStartLengthArray.length; i += 2) {
                const start = codePointStartLengthArray[i];
                const length = codePointStartLengthArray[i + 1];
                this.add(start, start + length);
            }
        }
    }

    /**
     * Gets the number of ranges in the map.
     */
    public get size() {
        return this._size;
    }

    /**
     * Gets the total number of code points included in the map.
     */
    public get codePointCount() {
        return this._codePointCount;
    }

    /**
     * Determines whether a code point is contained within the map.
     */
    public has(codePoint: number) {
        return codePoint >= CodePointRangeMap.MIN_CODE_POINT
            && codePoint <= CodePointRangeMap.MAX_CODE_POINT
            && this._has(this._root, codePoint);
    }

    private _has(node: CodePointRange | undefined, codePoint: number): boolean {
        return node === undefined ? false :
            codePoint < node.start ? this._has(node.left, codePoint) :
            codePoint > node.end ? this._has(node.right, codePoint) :
            true;
    }

    /**
     * Adds a code point to the map.
     */
    public add(codePoint: number): void;

    /**
     * Adds a code point range to the map.
     */
    public add(fromCodePoint: number, toCodePoint: number): void;

    public add(fromCodePoint: number, toCodePoint: number = fromCodePoint) {
        if (toCodePoint < fromCodePoint) [fromCodePoint, toCodePoint] = [toCodePoint, fromCodePoint];
        fromCodePoint = clamp(fromCodePoint, CodePointRangeMap.MIN_CODE_POINT, CodePointRangeMap.MAX_CODE_POINT);
        toCodePoint = clamp(toCodePoint, CodePointRangeMap.MIN_CODE_POINT, CodePointRangeMap.MAX_CODE_POINT);
        const context = { rebalance: false, modified: false };
        this._root = this._add(this._root, fromCodePoint, toCodePoint, context);
        return this;
    }

    private _add(node: CodePointRange | undefined, start: number, end: number, context: { rebalance: boolean, modified: boolean }): CodePointRange {
        if (node === undefined) { // range does not exist
            context.rebalance = true;
            context.modified = true;
            this._size++;
            this._codePointCount += end - start + 1;
            return { left: undefined, right: undefined, parent: undefined, start, end, balance: 0 };
        }
        else if (end < node.start - 1) { // range ends before `node` starts
            node.left = this._add(node.left, start, end, context);
            if (context.rebalance) {
                node = tiltLeft(node, context);
            }
        }
        else if (start > node.end + 1) { // range starts after `node` ends
            node.right = this._add(node.right, start, end, context);
            if (context.rebalance) {
                node = tiltRight(node, context);
            }
        }
        else { // range overlaps node
            let deletedFromLeft = false;
            if (start < node.start) {
                let max = rightmost(node.left);
                while (max && start < max.end) {
                    node.left = this._delete(node.left, start, end, context);
                    max = rightmost(node.left);
                    if (context.rebalance) {
                        deletedFromLeft = true;
                        context.rebalance = false;
                    }
                }
                this._codePointCount += node.start - start;
                node.start = start;
            }

            let deletedFromRight = false;
            if (end > node.end) {
                let min = leftmost(node.right);
                while (min && end >= min.start) {
                    node.right = this._delete(node.right, start, end, context);
                    min = leftmost(node.right);
                    if (context.rebalance) {
                        deletedFromRight = true;
                        context.rebalance = false;
                    }
                }
                this._codePointCount += end - node.end;
                node.end = end;
            }

            if (deletedFromLeft && !deletedFromRight) {
                context.rebalance = true;
                node = tiltRight(node, context);
            }
            if (deletedFromRight && !deletedFromLeft) {
                context.rebalance = true;
                node = tiltLeft(node, context);
            }
        }

        return node;
    }

    /**
     * Adds to this map all of the code points in another map.
     */
    public addRanges(other: CodePointRangeMap) {
        this._addRanges(other._root);
    }

    private _addRanges(otherNode: CodePointRange | undefined) {
        if (!otherNode) return;
        this._addRanges(otherNode.left);
        this.add(otherNode.start, otherNode.end);
        this._addRanges(otherNode.right);
    }

    /**
     * Deletes a code point from the map.
     */
    public delete(codePoint: number): boolean;

    /**
     * Deletes a code point range from the map.
     */
    public delete(fromCodePoint: number, toCodePoint: number): boolean;

    public delete(fromCodePoint: number, toCodePoint: number = fromCodePoint) {
        if (toCodePoint < fromCodePoint) [fromCodePoint, toCodePoint] = [toCodePoint, fromCodePoint];
        fromCodePoint = clamp(fromCodePoint, CodePointRangeMap.MIN_CODE_POINT, CodePointRangeMap.MAX_CODE_POINT);
        toCodePoint = clamp(toCodePoint, CodePointRangeMap.MIN_CODE_POINT, CodePointRangeMap.MAX_CODE_POINT);
        const context = { rebalance: false, modified: false };
        this._root = this._delete(this._root, fromCodePoint, toCodePoint, context);
        return context.modified;
    }

    private _delete(node: CodePointRange | undefined, start: number, end: number, context: { rebalance: boolean, modified: boolean }): CodePointRange | undefined {
        if (node === undefined) { // range does not exist
            return undefined;
        }
        else if (end < node.start) { // range ends before `node`
            node.left = this._delete(node.left, start, end, context);
            if (context.rebalance) node = tiltRight(node, context);
        }
        else if (start > node.end) { // range start is later than node
            node.right = this._delete(node.right, start, end, context);
            if (context.rebalance) node = tiltLeft(node, context);
        }
        else { // range overlaps node
            if (start < node.start) {
                let max = rightmost(node.left);
                while (max && start <= max.end) {
                    node.left = this._delete(node.left, start, end, context);
                    max = rightmost(node.left);
                }
            }

            if (end > node.end) {
                let min = leftmost(node.right);
                while (min && end >= min.start) {
                    node.right = this._delete(node.right, start, end, context);
                    min = leftmost(node.right);
                }
            }

            if (start <= node.start && end >= node.end) { // covers whole range
                if (node.left && node.right) {
                    const min = leftmost(node.right);
                    const { start, end } = node;
                    swap(node, min);
                    node.right = this._delete(node.right, start, end, context);
                    if (context.rebalance) node = tiltLeft(node, context);
                }
                else {
                    context.rebalance = true;
                    context.modified = true;
                    this._size--;
                    this._codePointCount -= node.end - node.start + 1;
                    return node.left || node.right;
                }
            }
            else if (start <= node.start) { // removes leading part of range
                this._codePointCount -= end - node.start + 1;
                node.start = end + 1;
            }
            else if (end >= node.end) { // removes trailing part of range
                this._codePointCount -= node.end - start + 1;
                node.end = start - 1;
            }
            else { // split node
                node.right = this._add(node.right, end + 1, node.end, context);
                node.end = start - 1;
                this._codePointCount -= end - start + 3;
                if (context.rebalance) node = tiltRight(node, context);
            }
        }

        return node;
    }

    /**
     * Deletes from this map all of the code points in another map.
     */
    public deleteRanges(other: CodePointRangeMap) {
        this._deleteRanges(other._root);
    }

    private _deleteRanges(otherNode: CodePointRange | undefined) {
        if (!otherNode) return;
        this._deleteRanges(otherNode.left);
        this.delete(otherNode.start, otherNode.end);
        this._deleteRanges(otherNode.right);
    }

    /**
     * Removes all of the code points from this map.
     */
    public clear() {
        this._root = undefined;
        this._size = 0;
        this._codePointCount = 0;
    }

    /**
     * Creates a flat array of code point ranges, where each range (in ascending order) is encoded
     * as two elements: the starting code point, and the length of the range.
     */
    public toCodePointStartLengthArray() {
        const codePointRanges: number[] = [];
        this._fillCodePointRangeArray(this._root, codePointRanges);
        return codePointRanges;
    }

    private _fillCodePointRangeArray(node: CodePointRange | undefined, codePointRanges: number[]) {
        if (node === undefined) return;
        this._fillCodePointRangeArray(node.left, codePointRanges);
        codePointRanges.push(node.start, node.end - node.start);
        this._fillCodePointRangeArray(node.right, codePointRanges);
    }

    /**
     * Creates a copy of this map.
     */
    public clone() {
        const clone = new CodePointRangeMap();
        clone._root = this._clone(this._root);
        clone._size = this._size;
        clone._codePointCount = this._codePointCount;
        return clone;
    }

    private _clone(node: CodePointRange | undefined): CodePointRange | undefined {
        if (!node) return undefined;
        return { left: this._clone(node.left), right: this._clone(node.right), parent: undefined, start: node.start, end: node.end, balance: node.balance };
    }

    /**
     * Gets a new map containing every charater *not* in this CharSet.
     */
    public invert() {
        const inverted = new CodePointRangeMap();
        let last = CodePointRangeMap.MIN_CODE_POINT;
        for (const [start, end] of this.codePointRanges()) {
            if (last < start) {
                inverted.add(last, start);
                last = end + 1;
            }
        }
        if (last < CodePointRangeMap.MAX_CODE_POINT) {
            inverted.add(last, CodePointRangeMap.MAX_CODE_POINT);
        }
        return inverted;
    }

    /**
     * Gets a regular expression character class fragment consisting of the characters in the set.
     */
    public toCharacterClass(): string {
        return `[${this._computeCharacterClass(this._root)}]`;
    }

    private _computeCharacterClass(node: CodePointRange | undefined): string {
        if (!node) return "";
        const left = this._computeCharacterClass(node.left);
        const range = node.start === node.end ? escapeCodePoint(node.start) : `${escapeCodePoint(node.start)}-${escapeCodePoint(node.end)}`;
        const right = this._computeCharacterClass(node.right);
        return left + range + right;
    }

    /**
     * Gets an iterator for every code point included in the set.
     */
    public * codePoints() {
        yield* this._codePoints(this._root);
    }

    private * _codePoints(node: CodePointRange | undefined): IterableIterator<number> {
        if (node === undefined) return;
        yield* this._codePoints(node.left);
        for (let i = node.start; i <= node.end; i++) yield i;
        yield* this._codePoints(node.right);
    }

    /**
     * Gets an iterator for every code point range (start and end), included in the set.
     */
    public * codePointRanges() {
        yield* this._codePointRanges(this._root);
    }

    private * _codePointRanges(node: CodePointRange | undefined): IterableIterator<[number, number]> {
        if (node === undefined) return;
        yield* this._codePointRanges(node.left);
        yield [node.start, node.end];
        yield* this._codePointRanges(node.right);
    }

    [Symbol.iterator]() {
        return this.codePointRanges();
    }
}

interface CodePointRange {
    parent: CodePointRange | undefined;
    left: CodePointRange | undefined;
    right: CodePointRange | undefined;
    start: number;
    end: number;
    balance: number;
}

function leftmost(node: CodePointRange): CodePointRange;
function leftmost(node: CodePointRange | undefined): CodePointRange | undefined;
function leftmost(node: CodePointRange | undefined) {
    while (node && node.left) node = node.left;
    return node;
}

function rightmost(node: CodePointRange): CodePointRange;
function rightmost(node: CodePointRange | undefined): CodePointRange | undefined;
function rightmost(node: CodePointRange | undefined) {
    while (node && node.right) node = node.right;
    return node;
}

function tiltLeft(node: CodePointRange, context: { rebalance: boolean }) {
    node.balance--; // tip `node` to the left
    if (node.balance === 0) {
        context.rebalance = false;
    }
    else if (node.balance === -2) { // tipped too far...
        if (node.left!.balance === 1) { // `node.left` unbalanced slightly to the right
            const leftRightBalance = node.left!.right!.balance;
            node.left = rotateLeft(node.left!);
            node = rotateRight(node);
            node.balance = 0;
            node.left!.balance = leftRightBalance === 1 ? -1 : 0;
            node.right!.balance = leftRightBalance === -1 ? 1 : 0;
        }
        else if (node.left!.balance === -1) { // `node.left` unbalanced slightly to the left
            node = rotateRight(node);
            node.balance = 0;
            node.right!.balance = 0;
        }
        else { // `node.left` is balanced
            node = rotateRight(node);
            node.balance = 1;
            node.right!.balance = -1;
        }
        context.rebalance = false;
    }
    return node;
}

function tiltRight(node: CodePointRange, context: { rebalance: boolean }) {
    node.balance++; // tip `node` to the right
    if (node.balance === 0) { // node is balanced
        context.rebalance = false;
    }
    else if (node.balance === 2) { // node unbalanced heavily to the right
        if (node.right!.balance === -1) { // `node.right` unbalanced slightly to the left
            const rightLeftBalance = node.right!.left!.balance;
            node.right = rotateRight(node.right!);
            node = rotateLeft(node);
            node.balance = 0;
            node.left!.balance = rightLeftBalance === 1 ? -1 : 0;
            node.right!.balance = rightLeftBalance === -1 ? 1 : 0;
        }
        else if (node.right!.balance === 1) { // `node.right` unbalanced slightly to the right
            node = rotateLeft(node);
            node.balance = 0;
            node.left!.balance = 0;
        }
        else { // `node.right` is balanced
            node = rotateLeft(node);
            node.balance = -1;
            node.left!.balance = 1;
            context.rebalance = false;
        }
        context.rebalance = false;
    }
    return node;
}

function rotateLeft(node: CodePointRange) {
    const right = node.right!;
    node.right = right.left;
    right.left = node;
    return right;
}

function rotateRight(node: CodePointRange) {
    const left = node.left!;
    node.left = left.right;
    left.right = node;
    return left;
}

function swap(left: CodePointRange, right: CodePointRange) {
    const { start, end } = left;
    left.start = right.start;
    left.end = right.end;
    right.start = start;
    right.end = end;
}

function clamp(value: number, min: number, max: number) {
    if (value < min) value = min;
    if (value > max) value = max;
    return value;
}

function escapeCodePoint(codePoint: number) {
    const text = codePoint.toString(16);
    return `\\u{${text.length % 2 === 1 ? "0" : ""}${text}}`;
}