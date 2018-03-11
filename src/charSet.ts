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

const MIN_CODE_POINT = 0;
const MAX_CODE_POINT = 0x10ffff;
const MAX_ASCII_CODE_POINT = 0x7f;

class Range {
    public static readonly domain = new Range(MIN_CODE_POINT, MAX_CODE_POINT);
    public readonly start: number;
    public readonly end: number;

    constructor(start: number, end: number = start) {
        if (end < start) throw new RangeError("'end' may not come before 'start'");
        if (start < MIN_CODE_POINT) throw new RangeError(`Argument out of range: start`);
        if (end > MAX_CODE_POINT) throw new RangeError(`Argument out of range: end`);
        this.start = start;
        this.end = end;
    }

    public get size() {
        return this.end - this.start + 1;
    }

    public static fromStartLength(start: number, length: number) {
        return new Range(start, start + length);
    }

    /* istanbul ignore next */
    private _debugToString() {
        return this.size === 1 ? `(${this.start})` : `(${this.start},${this.end})`;
    }
}

class Tree {
    public root = Node.nil;
    public codePointCount = 0;
    public codePointRangeCount = 0;
    public hasChanges = false;
    public offBalance = false;
}

class Node {
    public static readonly nil = (() => {
        const nil: Node = Object.create(Node.prototype);
        (<any>nil).tree = Object.create(Tree.prototype);
        nil.tree.root = nil;
        nil.tree.codePointCount = 0;
        nil.tree.codePointRangeCount = 0;
        nil.tree.hasChanges = false;
        nil.tree.offBalance = false;
        nil.parent = nil;
        nil.left = nil;
        nil.right = nil;
        nil.range = new Range(0);
        nil.min = nil.range;
        nil.max = nil.range;
        nil.height = 0;
        Object.freeze(nil.tree);
        Object.freeze(nil.range);
        Object.freeze(nil);
        return nil;
    })();

    public readonly tree: Tree;
    public parent: Node;
    public left: Node;
    public right: Node;
    public range: Range;
    public height: number;
    public min: Range;
    public max: Range;

    constructor(tree: Tree, range: Range) {
        this.tree = tree;
        this.parent = Node.nil;
        this.left = Node.nil;
        this.right = Node.nil;
        this.range = range;
        this.min = range;
        this.max = range;
        this.height = 1;
    }

    /* istanbul ignore next */
    private _debugToString(pretty?: boolean) {
        if (this === Node.nil) return ``;
        const side = this === this.parent.left ? `L` : this === this.parent.right ? `R` : `N`;
        const extra = pretty ? ` h:${this.height}, b:${balance(this)}` : ``;
        return `${side}${this.range["_debugToString"]()}${extra}`;
    }
}

export interface ReadonlyCharSet {
    readonly size: number;
    readonly characterClass: string;
    has(codePoint: number): boolean;
    has(codePointRange: [number, number]): boolean;
    has(codePointSet: ReadonlyCharSet): boolean;
    has(fromCodePoint: number, toCodePoint: number): boolean;
    union(other: ReadonlyCharSet): CharSet;
    intersect(other: ReadonlyCharSet): CharSet;
    except(other: ReadonlyCharSet): CharSet;
    invert(): CharSet;
    equals(other: ReadonlyCharSet): boolean;
    supersetOf(subset: ReadonlyCharSet, proper?: boolean): boolean;
    subsetOf(superset: ReadonlyCharSet, proper?: boolean): boolean;
    toStartLengthArray(): number[];
    codePoints(): IterableIterator<number>;
    codePointRanges(): IterableIterator<[number, number]>;
    [Symbol.iterator](): IterableIterator<number>;
}

export class CharSet {
    public static readonly MIN_CODE_POINT = MIN_CODE_POINT;
    public static readonly MAX_CODE_POINT = MAX_CODE_POINT;
    public static readonly MAX_ASCII_CODE_POINT = MAX_ASCII_CODE_POINT;
    private static _empty: ReadonlyCharSet | undefined;
    private static _any: ReadonlyCharSet | undefined;
    private static _ascii: ReadonlyCharSet | undefined;
    private _tree: Tree;
    private _characterClass: string | undefined = undefined;

    constructor(iterable?: Iterable<number | [number, number] | ReadonlyCharSet>) {
        this._tree = new Tree();
        if (iterable) {
            for (const value of iterable) {
                if (typeof value === "number") this.add(value);
                else if (Array.isArray(value)) this.add(value);
                else if (value instanceof CharSet) this.add(value);
                else throw new TypeError();
            }
        }
    }

    public get size() {
        return this._tree.codePointCount;
    }

    public get characterClass() {
        if (this._characterClass === undefined) {
            let characterClass = "[";
            for (let n = min(this._tree.root); n !== Node.nil; n = successor(n)) {
                characterClass += n.range.size === 1
                    ? `\\u{${n.range.start.toString(16)}}`
                    : `\\u{${n.range.start.toString(16)}}-\\u{${n.range.end.toString(16)}}`;
            }
            this._characterClass = characterClass + "]";
        }
        return this._characterClass;
    }

    public static empty() {
        return CharSet._empty || (CharSet._empty = Object.freeze(new CharSet()));
    }

    public static any() {
        return CharSet._any || (CharSet._any = Object.freeze(new CharSet().add(MIN_CODE_POINT, MAX_CODE_POINT)));
    }

    public static ascii() {
        return CharSet._ascii || (CharSet._ascii = Object.freeze(new CharSet().add(MIN_CODE_POINT, MAX_ASCII_CODE_POINT)));
    }

    public static range(fromCodePoint: number, toCodePoint: number) {
        return new CharSet().add(fromCodePoint, toCodePoint);
    }

    public static from(iterable: Iterable<number | [number, number] | ReadonlyCharSet>) {
        return new CharSet(iterable);
    }

    public static of(...args: (number | [number, number] | ReadonlyCharSet)[]) {
        return new CharSet(args);
    }

    public static fromStartLengthArray(array: ReadonlyArray<number>) {
        if (array.length % 2 !== 0) throw new TypeError();

        const set = new CharSet();
        if (array.length === 0) return set;

        const chunks: number[] = [];
        let start = 0;
        let end = array.length >> 1;
        let mid = start + ((end - start) >> 1);
        let index = mid << 1;

        const root = new Node(set._tree, Range.fromStartLength(array[index], array[index + 1]));
        set._tree.codePointRangeCount++;
        set._tree.codePointCount += root.range.size;
        chunks.push(mid + 1, end); // push the right side
        end = mid;

        let current = root;
        while (start < end) { // descend left spine
            mid = start + ((end - start) >> 1);
            index = mid << 1;
            const k = Range.fromStartLength(array[index], array[index + 1]);
            if (k.end >= current.range.start - 1) throw new TypeError();
            current.left = new Node(set._tree, k);
            current.left.parent = current;
            current = current.left;
            set._tree.codePointRangeCount++;
            set._tree.codePointCount += current.range.size;
            chunks.push(mid + 1, end);
            end = mid;
        }

        while (chunks.length > 0) {
            end = chunks.pop()!;
            start = chunks.pop()!;

            if (start < end && current.right === Node.nil) { // descend right spine
                chunks.push(start, end);
                mid = start + ((end - start) >> 1);
                index = mid << 1;
                const k = Range.fromStartLength(array[index], array[index + 1]);
                if (k.start <= current.range.end + 1) throw new TypeError();
                current.right = new Node(set._tree, k);
                current.right.parent = current;
                current = current.right;
                set._tree.codePointRangeCount++;
                set._tree.codePointCount += current.range.size;
                chunks.push(mid + 1, end);
                end = mid;
                while (start < end) { // descend left spine
                    mid = start + ((end - start) >> 1);
                    index = mid << 1;
                    const k = Range.fromStartLength(array[index], array[index + 1]);
                    if (k.end >= current.range.start - 1) throw new TypeError();
                    current.left = new Node(set._tree, k);
                    current.left.parent = current;
                    current = current.left;
                    set._tree.codePointRangeCount++;
                    set._tree.codePointCount += current.range.size;
                    chunks.push(mid + 1, end);
                    end = mid;
                }
            }
            else { // no right, ascend
                recalculate(current);
                current = current.parent;
            }
        }

        recalculate(root);
        set._tree.root = root;
        return set;
    }

    public has(codePoint: number): boolean;
    public has(codePointRange: [number, number]): boolean;
    public has(codePointSet: ReadonlyCharSet): boolean;
    public has(fromCodePoint: number, toCodePoint: number): boolean;
    public has(start: number | [number, number] | ReadonlyCharSet, end?: number) {
        if (start instanceof CharSet) {
            return this.supersetOf(start);
        }

        let range: Range;
        if (typeof start === "number") {
            range = new Range(start, end);
        }
        else if (Array.isArray(start) && typeof start[0] === "number" && typeof start[1] === "number") {
            range = new Range(start[0], start[1]);
        }
        else {
            throw new TypeError("Invalid argument");
        }

        let node = this._tree.root;
        while (node !== Node.nil) {
            if (range.end < node.range.start) {
                node = node.left;
            }
            else if (range.start > node.range.end) {
                node = node.right;
            }
            else {
                return node.range.start <= range.start &&
                    node.range.end >= range.end;
            }
        }
        return false;
    }

    public add(codePoint: number): this;
    public add(codePointRange: [number, number]): this;
    public add(codePointSet: ReadonlyCharSet): this;
    public add(fromCodePoint: number, toCodePoint: number): this;
    public add(start: number | [number, number] | ReadonlyCharSet, end?: number) {
        if (Object.isFrozen(this)) throw new TypeError("Object is read-only.");
        if (start instanceof CharSet) {
            if (start._tree.codePointRangeCount === 0) return this;
            if (start._tree.codePointRangeCount > 1) {
                const tree = new Tree();
                tree.root = union(tree, this._tree.root, start._tree.root);
                this._tree = tree;
                return this;
            }

            const range = start._tree.root.range;
            start = range.start;
            end = range.end;
        }

        let range: Range;
        if (typeof start === "number") {
            range = new Range(start, end);
        }
        else if (Array.isArray(start) && typeof start[0] === "number" && typeof start[1] === "number") {
            range = new Range(start[0], start[1]);
        }
        else {
            throw new TypeError();
        }

        this._tree.root = insert(this._tree, this._tree.root, Node.nil, range);
        this._tree.offBalance = false;
        if (this._tree.hasChanges) {
            this._tree.hasChanges = false;
            this._characterClass = undefined;
        }
        return this;
    }

    public delete(codePoint: number): boolean;
    public delete(codePointRange: [number, number]): boolean;
    public delete(codePointSet: ReadonlyCharSet): boolean;
    public delete(fromCodePoint: number, toCodePoint: number): boolean;
    public delete(start: number | [number, number] | ReadonlyCharSet, end?: number) {
        if (Object.isFrozen(this)) throw new TypeError("Object is read-only.");
        if (start instanceof CharSet) {
            if (start._tree.codePointRangeCount === 0) return this;
            if (start._tree.codePointRangeCount > 1) {
                const tree = new Tree();
                tree.root = difference(tree, this._tree.root, start._tree.root);
                this._tree = tree;
                return this;
            }

            const range = start._tree.root.range;
            start = range.start;
            end = range.end;
        }

        let range: Range;
        if (typeof start === "number") {
            range = new Range(start, end);
        }
        else if (Array.isArray(start) && typeof start[0] === "number" && typeof start[1] === "number") {
            range = new Range(start[0], start[1]);
        }
        else {
            throw new TypeError();
        }

        this._tree.root = remove(this._tree, this._tree.root, Node.nil, range);
        this._tree.offBalance = false;
        if (this._tree.hasChanges) {
            this._tree.hasChanges = false;
            this._characterClass = undefined;
            return true;
        }
        return false;
    }

    public clear() {
        if (Object.isFrozen(this)) throw new TypeError("Object is read-only.");
        this._tree = new Tree();
        this._characterClass = undefined;
    }

    public union(other: ReadonlyCharSet) {
        if (!(other instanceof CharSet)) throw new TypeError();
        const set = new CharSet();
        set._tree.root = union(set._tree, this._tree.root, other._tree.root);
        return set;
    }

    public intersect(other: ReadonlyCharSet) {
        if (!(other instanceof CharSet)) throw new TypeError();
        const set = new CharSet();
        set._tree.root = intersect(set._tree, this._tree.root, other._tree.root);
        return set;
    }

    public except(other: ReadonlyCharSet) {
        if (!(other instanceof CharSet)) throw new TypeError();
        const set = new CharSet();
        set._tree.root = difference(set._tree, this._tree.root, other._tree.root);
        return set;
    }

    public invert() {
        const set = new CharSet();
        set._tree.root = difference(set._tree, new Node(this._tree, Range.domain), this._tree.root);
        return set;
    }

    public equals(other: ReadonlyCharSet): boolean {
        if (!(other instanceof CharSet)) throw new TypeError();
        if (this === other) return true;
        if (this._tree.root === Node.nil) return other._tree.root === Node.nil;
        if (other._tree.root === Node.nil) return false;
        let l = min(this._tree.root);
        let r = min(other._tree.root);
        while (l !== Node.nil && r !== Node.nil) {
            if (l.range.start !== r.range.start || l.range.end !== r.range.end) return false;
            l = successor(l);
            r = successor(r);
        }
        return l === Node.nil && r === Node.nil;
    }

    public supersetOf(subset: ReadonlyCharSet, proper?: boolean): boolean {
        if (!(subset instanceof CharSet)) throw new TypeError();
        if (this === subset) return !proper;
        if (this._tree.root === Node.nil) return !proper && subset._tree.root === Node.nil;
        if (subset._tree.root === Node.nil) return true;
        let possiblyImproper = false;
        let supersetNode = min(this._tree.root);
        let subsetNode = min(subset._tree.root);
        while (supersetNode !== Node.nil && subsetNode !== Node.nil) {
            const supersetRange = supersetNode.range;
            const subsetRange = subsetNode.range;
            if (supersetRange.start === subsetRange.start && supersetRange.end === subsetRange.end) {
                supersetNode = successor(supersetNode);
                subsetNode = successor(subsetNode);
            }
            else {
                if (supersetRange.end < subsetRange.start) {
                    supersetNode = successor(supersetNode);
                }
                else if (supersetRange.start <= subsetRange.start && supersetRange.end >= subsetRange.end) {
                    subsetNode = successor(subsetNode);
                }
                else {
                    return false;
                }
                possiblyImproper = true;
            }
        }
        if (supersetNode === Node.nil) possiblyImproper = true;
        if (subsetNode !== Node.nil) return false;
        if (proper && possiblyImproper) return false;
        return true;
    }

    public subsetOf(superset: ReadonlyCharSet, proper?: boolean): boolean {
        if (!(superset instanceof CharSet)) throw new TypeError();
        return superset.supersetOf(this, proper);
    }

    public toStartLengthArray() {
        const array: number[] = [];
        const stack: Node[] = [];
        let node = this._tree.root;
        while (node !== Node.nil) {
            stack.push(node);
            node = node.left;
        }

        while ((node = stack.pop() || Node.nil) !== Node.nil) {
            array.push(node.range.start, node.range.size - 1);
            if (node.right !== Node.nil) {
                node = node.right;
                while (node !== Node.nil) {
                    stack.push(node);
                    node = node.left;
                }
            }
        }
        return array;
    }

    public * codePoints() {
        for (let n = min(this._tree.root); n !== Node.nil; n = successor(n)) {
            for (let i = n.range.start; i <= n.range.end; i++) {
                yield i;
            }
        }
    }

    public * codePointRanges() {
        for (let n = min(this._tree.root); n !== Node.nil; n = successor(n)) {
            yield [n.range.start, n.range.end] as [number, number];
        }
    }

    [Symbol.iterator]() {
        return this.codePoints();
    }

    /* istanbul ignore next */
    private get _debugCodePointRangeCount() {
        return this._tree.codePointRangeCount;
    }

    /* istanbul ignore next */
    private _debugVerify() {
        const set = this;
        const context = { codePointRangeCount: 0, codePointCount: 0 };
        const seen = new Set<Node>();
        visit(this._tree, this._tree.root, Node.nil);
        assertEqual(this._tree.codePointCount, context.codePointCount, `Incorrect code point count.`);
        assertEqual(this._tree.codePointRangeCount, context.codePointRangeCount, `Incorrect code point range count.`);
        assertEqual(this._tree.hasChanges, false, `Tree should not have pending changes.`);
        assertEqual(this._tree.offBalance, false, `Tree should not have pending balance adjustments.`);

        function visit(tree: Tree, node: Node, parent: Node) {
            if (node === Node.nil) return;
            assert(node.tree === tree, `Incorrect tree.`);
            assertEqual(node.parent, parent, `Incorrect parent.`);
            assert(parent !== Node.nil || tree.root === node, `Non-root node has no parent.`);
            assert(Math.abs(balance(node)) <= 1, `Off-balance node: ${node["_debugToString"](true)}`);
            if (parent.left === node) {
                assert(node.range.end < parent.range.start - 1, `${node["_debugToString"]()} overlaps or is adjacent to range of parent (${node.parent["_debugToString"]()})`);
            }
            if (parent.right === node) {
                assert(node.range.start > parent.range.end + 1, `${node["_debugToString"]()} overlaps or is adjacent to range of parent (${node.parent["_debugToString"]()})`);
            }
            assert(!seen.has(node), `Cycle exists in tree.`);
            context.codePointRangeCount++;
            context.codePointCount += node.range.size;
            visit(tree, node.left, node);
            if (node.left !== Node.nil) {
                assertEqual(node.min["_debugToString"](), node.left.min["_debugToString"](), `Incorrect min for node: ${node["_debugToString"]()}`);
            }
            else {
                assertEqual(node.min["_debugToString"](), node.range["_debugToString"](), `Incorrect min for node: ${node["_debugToString"]()}`);
            }

            visit(tree, node.right, node);
            if (node.right !== Node.nil) {
                assertEqual(node.max["_debugToString"](), node.right.max["_debugToString"](), `Incorrect max for node: ${node["_debugToString"]()}`);
            }
            else {
                assertEqual(node.max["_debugToString"](), node.range["_debugToString"](), `Incorrect max for node: ${node["_debugToString"]()}`);
            }
        }

        function assert(test: any, message: string = "Assertion failed.") {
            if (!test) {
                message += `\n${set._debugToString(true)}`;
                const err = new Error(message);
                if ((<any>Error).captureStackTrace) (<any>Error).captureStackTrace(err, assert);
                throw err;
            }
        }

        function assertEqual(actual: any, expected: any, message: string = "Assertion failed.") {
            if (expected !== actual) {
                message += "\n";
                if (expected instanceof Node) expected = expected["_debugToString"]();
                if (actual instanceof Node) actual = actual["_debugToString"]();
                message += `Expected: ${expected}, Actual: ${actual}`;
                message += `\n${set._debugToString(true)}`;
                const err = new Error(message);
                if ((<any>Error).captureStackTrace) (<any>Error).captureStackTrace(err, assertEqual);
                throw err;
            }
        }
    }

    /* istanbul ignore next */
    private _debugToString(pretty?: boolean) {
        const set = new Set<Node>();
        return visit(this._tree.root, "");

        function visit(node: Node, indent: string) {
            if (node === Node.nil) return "";
            if (set.has(node)) return "[Circular]";
            set.add(node);
            let text = `${indent}${node["_debugToString"](pretty)}`;
            if (node.left !== Node.nil || node.right !== Node.nil) {
                if (!pretty) text += `{`;
                if (node.left !== Node.nil) {
                    if (pretty) text += `\n`;
                    text += visit(node.left, pretty ? ` ` + indent : ``);
                }
                if (node.right !== Node.nil) {
                    if (pretty) text += `\n`;
                    text += visit(node.right, pretty ? ` ` + indent : ``);
                }
                if (!pretty) text += `}`;
            }
            return text;
        }
    }
}

declare global {
    interface ObjectConstructor {
        freeze(object: ReadonlyCharSet): ReadonlyCharSet;
    }
}

function balance(node: Node) {
    return node.right.height - node.left.height;
}

function recalculate(node: Node) {
    node.height = 1 + (node.left.height > node.right.height ? node.left.height : node.right.height);
    node.min = node.left === Node.nil ? node.range : node.left.min;
    node.max = node.right === Node.nil ? node.range : node.right.max;
}

function rotateLeft(node: Node) {
    const center = node.right;
    node.right = center.left;
    center.left = node;
    center.parent = node.parent;
    node.parent = center;
    if (node.right !== Node.nil) node.right.parent = node;
    recalculate(node);
    recalculate(center);
    return center;
}

function rotateRight(node: Node) {
    const center = node.left;
    node.left = center.right;
    center.right = node;
    center.parent = node.parent;
    node.parent = center;
    if (node.left !== Node.nil) node.left.parent = node;
    recalculate(node);
    recalculate(center);
    return center;
}

function rotateLeftRight(node: Node) {
    const left = node.left;
    const center = left.right;
    left.right = center.left;
    node.left = center.right;
    center.left = left;
    center.right = node;
    center.parent = node.parent;
    left.parent = center;
    node.parent = center;
    if (left.right !== Node.nil) left.right.parent = left;
    if (node.left !== Node.nil) node.left.parent = node;
    recalculate(left);
    recalculate(node);
    recalculate(center);
    return center;
}

function rotateRightLeft(node: Node) {
    const right = node.right;
    const center = right.left;
    right.left = center.right;
    node.right = center.left;
    center.left = node;
    center.right = right;
    center.parent = node.parent;
    node.parent = center;
    right.parent = center;
    if (node.right !== Node.nil) node.right.parent = node;
    if (right.left !== Node.nil) right.left.parent = right;
    recalculate(node);
    recalculate(right);
    recalculate(center);
    return center;
}

function insert(tree: Tree, node: Node, parent: Node, k: Range): Node {
    let reuseFrame: boolean;
    do {
        if (node === Node.nil) {
            node = new Node(tree, k);
            node.parent = parent;
            tree.offBalance = true;
            tree.hasChanges = true;
            tree.codePointRangeCount++;
            tree.codePointCount += k.size;
            return node;
        }

        const m = node.range;
        if (k.end < m.start - 1) { // k is entirely before m
            node.left = insert(tree, node.left, node, k);
            reuseFrame = false;
        }
        else if (k.start > m.end + 1) { // k is entirely after m
            node.right = insert(tree, node.right, node, k);
            reuseFrame = false;
        }
        else if (k.start < m.start && node.left !== Node.nil) { // k overlaps m.start
            if (k.start - 1 === node.left.max.end) console.log("Abuts left max end");
            node.left = remove(tree, node.left, node, new Range(k.start, m.start - 1));
            node.range = new Range(k.start, m.end);
            tree.hasChanges = true;
            tree.codePointCount += m.start - k.start;
            reuseFrame = true; // try again (reuse stack frame)
        }
        else if (k.end > m.end && node.right !== Node.nil) { // k overlaps m.end
            node.right = remove(tree, node.right, node, new Range(m.end + 1, k.end));
            node.range = new Range(m.start, k.end);
            tree.hasChanges = true;
            tree.codePointCount += k.end - m.end;
            reuseFrame = true; // try again (reuse stack frame)
        }
        else if (node.left !== Node.nil && k.start - 1 === node.left.max.end) {
            k = new Range(node.left.max.start, k.end);
            reuseFrame = true;
        }
        else if (node.right !== Node.nil && k.end + 1 === node.right.min.start) {
            k = new Range(k.start, node.right.min.end);
            reuseFrame = true;
        }
        else if (k.start >= m.start && k.end <= m.end) { // k is entirely within m
            return node;
        }
        else {
            node.range = new Range(Math.min(m.start, k.start), Math.max(m.end, k.end));
            tree.hasChanges = true;
            tree.codePointCount += node.range.size - m.size;
            reuseFrame = false;
        }

        recalculate(node);
        if (tree.offBalance) {
            switch (balance(node)) {
                case 0:
                    tree.offBalance = false;
                    break;
                case 1: case -1:
                    break;
                case -2:
                    switch (balance(node.left)) {
                        case -1:
                            node = rotateRight(node);
                            tree.offBalance = false;
                            break;
                        case 1:
                            node = rotateLeftRight(node);
                            tree.offBalance = false;
                            break;
                    }
                    break;
                case 2:
                    switch (balance(node.right)) {
                        case -1:
                            node = rotateRightLeft(node);
                            tree.offBalance = false;
                            break;
                        case 1:
                            node = rotateLeft(node);
                            tree.offBalance = false;
                            break;
                    }
                    break;
                /* istanbul ignore next */
                default:
                    throw new TypeError(`off balance: ${balance(node)}`);
            }
        }
    }
    while (reuseFrame);
    return node;
}

function remove(tree: Tree, node: Node, parent: Node, k: Range): Node {
    let reuseFrame: boolean;
    do {
        if (node === Node.nil) return Node.nil;
        const m = node.range;
        if (k.end < m.start) { // k is entirely before m
            if (node.left === Node.nil) return node;
            node.left = remove(tree, node.left, node, k);
            reuseFrame = false;
        }
        else if (k.start > m.end) { // k is entirely after m
            if (node.left === Node.nil) return node;
            node.right = remove(tree, node.right, node, k);
            reuseFrame = false;
        }
        else {
            if (k.start < m.start) { // k overlaps m.start
                const k_ = new Range(k.start, m.start - 1);
                k = new Range(m.start, k.end);
                node.left = remove(tree, node.left, node, k_);
                reuseFrame = true; // try again (reuse stack frame)
            }
            else if (k.end > m.end) { // k overlaps m.end
                const k_ = new Range(m.end + 1, k.end);
                k = new Range(k.start, m.end);
                node.right = remove(tree, node.right, node, k_);
                reuseFrame = true; // try again (reuse stack frame)
            }
            else if (k.start > m.start && k.end === m.end) { // k removes right part of m
                node.range = new Range(m.start, k.start - 1);
                tree.hasChanges = true;
                tree.codePointCount -= m.size - node.range.size;
                reuseFrame = false;
            }
            else if (k.start === m.start && k.end < m.end) { // k removes left part of m
                node.range = new Range(k.end + 1, m.end);
                tree.hasChanges = true;
                tree.codePointCount -= m.size - node.range.size;
                reuseFrame = false;
            }
            else if (k.start > m.start && k.end < m.end) { // k bisects m
                node.range = new Range(m.start, k.start - 1);
                node.right = insert(tree, node.right, node, new Range(k.end + 1, m.end));
                tree.hasChanges = true;
                tree.codePointCount -= k.size + 2;
                reuseFrame = false;
            }
            else { // k matches m
                if (node.left !== Node.nil && node.right !== Node.nil) {
                    let min = node.right;
                    while (min.left !== Node.nil) min = min.left;
                    const range = min.range;
                    min.range = node.range;
                    node.range = range;
                    node.right = remove(tree, node.right, node, k);
                    reuseFrame = false;
                }
                else {
                    tree.hasChanges = true;
                    tree.offBalance = true;
                    tree.codePointCount -= node.range.size;
                    tree.codePointRangeCount--;
                    if (node.left !== Node.nil) {
                        node = node.left;
                        node.parent = parent;
                        return node;
                    }
                    if (node.right !== Node.nil) {
                        node = node.right;
                        node.parent = parent;
                        return node;
                    }
                    return Node.nil;
                }
            }
        }

        recalculate(node);
        if (tree.offBalance) {
            switch (balance(node)) {
                case 0:
                    break;
                case -1:
                case 1:
                    tree.offBalance = false;
                    break;
                case -2:
                    switch (balance(node.left)) {
                        case -1:
                            node = rotateRight(node);
                            break;
                        case 0:
                            node = rotateRight(node);
                            tree.offBalance = false;
                            break;
                        case 1:
                            node = rotateLeftRight(node);
                            break;
                    }
                    break;
                case 2:
                    switch (balance(node.right)) {
                        case -1:
                            node = rotateRightLeft(node);
                            break;
                        case 0:
                            node = rotateLeft(node);
                            tree.offBalance = false;
                            break;
                        case 1:
                            node = rotateLeft(node);
                            break;
                    }
                    break;
                /* istanbul ignore next */
                default:
                    throw new TypeError(`off balance: ${balance(node)}`);
            }
        }
    }
    while (reuseFrame);
    return node;
}

function min(node: Node) {
    while (node.left !== Node.nil) node = node.left;
    return node;
}

function successor(node: Node) {
    if (node === Node.nil) return Node.nil;
    if (node.right !== Node.nil) return min(node.right);
    while (node.parent !== Node.nil && node === node.parent.right) node = node.parent;
    return node.parent;
}

function createNode(tree: Tree, left: Node, range: Range, right: Node) {
    const node = new Node(tree, range);
    node.left = importSubtree(tree, left);
    node.right = importSubtree(tree, right);
    if (node.left !== Node.nil) node.left.parent = node;
    if (node.right !== Node.nil) node.right.parent = node;
    recalculate(node);
    return node;
}

function split(tree: Tree, T: Node, k: Range): [Node, Range | undefined, Node] {
    if (T === Node.nil) return [Node.nil, undefined, Node.nil];
    let { left: L, range: m, right: R } = T;
    if (k.end < m.start) { // k is entirely before m
        const [Ll, b, Lr] = split(tree, L, k);
        return [Ll, b, join(tree, Lr, m, R)];
    }
    if (k.start > m.end) { // k is entirely after m
        const [Rl, b, Rr] = split(tree, R, k);
        return [join(tree, L, m, Rl), b, Rr];
    }
    if (k.start < m.start) { // k overlaps m.start
        const [Ll, , Lr] = split(tree, L, new Range(k.start, m.start - 1));
        L = join2(tree, Ll, Lr);
        k = new Range(m.start, k.end);
    }
    if (k.end > m.end) { // k overlaps m.end
        const [Rl, , Rr] = split(tree, R, new Range(m.end + 1, k.end));
        R = join2(tree, Rl, Rr);
        k = new Range(k.start, m.end);
    }
    if (k.start > m.start) { // k.start bisects m
        const k_ = new Range(m.start, k.start - 1);
        const [Ll, , Lr] = split(tree, L, k_);
        L = join(tree, Ll, k_, Lr);
        m = new Range(k.start, m.end);
    }
    if (k.end < m.end) { // k.end bisects m
        const k_ = new Range(k.end + 1, m.end);
        const [Rl, , Rr] = split(tree, R, k_);
        R = join(tree, Rl, k_, Rr);
        m = new Range(m.start, k.end);
    }
    return [L, m, R];
}

function join(tree: Tree, Tl: Node, k: Range, Tr: Node): Node {
    if (Tl.height > Tr.height + 1) return joinRight(tree, Tl, k, Tr);
    if (Tr.height > Tl.height + 1) return joinLeft(tree, Tl, k, Tr);
    return createNode(tree, Tl, k, Tr);
}

function joinRight(tree: Tree, Tl: Node, kR: Range, Tr: Node): Node {
    const { left: l, range: kL, right: c } = Tl;
    if (c.height <= Tr.height + 1) {
        const T_ = createNode(tree, c, kR, Tr);
        return T_.height <= l.height + 1
            ? createNode(tree, l, kL, T_)
            : rotateLeft(createNode(tree, l, kL, rotateRight(T_)));
    }
    else {
        const T_ = joinRight(tree, c, kR, Tr);
        const T__ = createNode(tree, l, kL, T_);
        return T__.height <= l.height + 1 ? T__ : rotateLeft(T__);
    }
}

function joinLeft(tree: Tree, Tl: Node, kL: Range, Tr: Node): Node {
    const { left: c, range: kR, right: r } = Tr;
    if (c.height <= Tl.height + 1) {
        const T_ = createNode(tree, Tl, kL, c);
        return T_.height <= r.height + 1
            ? createNode(tree, T_, kR, r)
            : rotateRight(createNode(tree, rotateLeft(T_), kR, r));
    }
    else {
        const T_ = joinLeft(tree, Tl, kL, c);
        const T__ = createNode(tree, T_, kR, r);
        return T__.height <= r.height + 1 ? T__ : rotateRight(T__);
    }
}

function join2(tree: Tree, Tl: Node, Tr: Node) {
    if (Tl === Node.nil) return Tr;
    const [Tl_, k] = splitLast(tree, Tl);
    return join(tree, Tl_, k, Tr);
}

function splitLast(tree: Tree, T: Node): [Node, Range] {
    const { left: L, range: k, right: R } = T;
    if (R === Node.nil) return [L, k];
    const [T_, k_] = splitLast(tree, R);
    return [join(tree, L, k, T_), k_];
}

function importSubtree(tree: Tree, node: Node, context?: Tree): Node {
    if (node === Node.nil) return Node.nil;
    const root = new Node(tree, node.range);
    root.min = node.min;
    root.max = node.max;
    root.height = node.height;
    let current = node;
    let clone = root;
    if (context) context.codePointRangeCount++, context.codePointCount += clone.range.size;
    while (current !== Node.nil && current !== node.parent) {
        if (current.left !== Node.nil && clone.left === Node.nil) {
            clone.left = new Node(tree, current.left.range);
            clone.left.min = current.left.min;
            clone.left.max = current.left.max;
            clone.left.parent = clone;
            clone.left.height = current.left.height;
            clone = clone.left;
            current = current.left;
            if (context) context.codePointRangeCount++, context.codePointCount += clone.range.size;
        }
        else if (current.right !== Node.nil && clone.right === Node.nil) {
            clone.right = new Node(tree, current.right.range);
            clone.right.parent = clone;
            clone.right.height = current.right.height;
            clone.right.min = current.right.min;
            clone.right.max = current.right.max;
            clone = clone.right;
            current = current.right;
            if (context) context.codePointRangeCount++, context.codePointCount += clone.range.size;
        }
        else {
            if (clone === root) break;
            current = current.parent;
            clone = clone.parent;
        }
    }
    return root;
}

function union(tree: Tree, T1: Node, T2: Node): Node {
    if (T1 === Node.nil) return importSubtree(tree, T2, tree);
    if (T2 === Node.nil) return importSubtree(tree, T1, tree);
    const { left: L2, range: k2, right: R2 } = T2;
    const [L1, k1, R1] = split(tree, T1, k2);
    let k = k1 ? new Range(Math.min(k1.start, k2.start), Math.max(k1.end, k2.end)) : k2;
    let Tl = union(tree, L1, L2);
    let Tr = union(tree, R1, R2);

    if (Tl !== Node.nil) {
        const Tlmax = Tl.max;
        if (Tlmax.end === k.start - 1) {
            tree.codePointRangeCount--;
            tree.codePointCount -= Tlmax.size;
            const [Tll, , Tlr] = split(tree, Tl, Tlmax);
            Tl = join2(tree, Tll, Tlr);
            k = new Range(Tlmax.start, k.end);
        }
    }

    if (Tr !== Node.nil) {
        const Trmin = Tr.min;
        if (Trmin.start === k.end + 1) {
            tree.codePointRangeCount--;
            tree.codePointCount -= Trmin.size;
            const [Trl, , Trr] = split(tree, Tr, Trmin);
            Tr = join2(tree, Trl, Trr);
            k = new Range(k.start, Trmin.end);
        }
    }

    tree.codePointRangeCount++;
    tree.codePointCount += k.size;
    return join(tree, Tl, k, Tr);
}

function intersect(tree: Tree, T1: Node, T2: Node): Node {
    if (T1 === Node.nil) return Node.nil;
    if (T2 === Node.nil) return Node.nil;
    const { left: L2, range: k2, right: R2 } = T2;
    const [L1, b, R1] = split(tree, T1, k2);
    const Tl = intersect(tree, L1, L2);
    const Tr = intersect(tree, R1, R2);
    if (b) {
        const [,,T1r] = split(tree, T1, new Range(k2.start - 1));
        const [Tm] = split(tree, T1r, new Range(k2.end + 1));
        if (Tm !== Node.nil) {
            return join2(tree, join2(tree, Tl, importSubtree(tree, Tm, tree)), Tr);
        }
    }
    return join2(tree, Tl, Tr);
}

function difference(tree: Tree, T1: Node, T2: Node): Node {
    if (T1 === Node.nil) return Node.nil;
    if (T2 === Node.nil) return importSubtree(tree, T1, tree);
    const { left: L2, range: k2, right: R2 } = T2;
    const [L1, k1, R1] = split(tree, T1, k2);
    const Tl = difference(tree, L1, L2);
    const Tr = difference(tree, R1, R2);
    return join2(tree, Tl, Tr);
}