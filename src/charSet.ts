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

import { Range, Node, insert, remove, union, intersect, difference, invert, deserialize, search,
    equals, serialize, size, rangeSize, leftmost, supersetOf, iterate } from "./rangeTree"

const MIN_CODE_POINT = 0;
const MAX_CODE_POINT = 0x10ffff;
const MAX_ASCII_CODE_POINT = 0x7f;

const anyCodePoint = new Range(MIN_CODE_POINT, MAX_CODE_POINT);
const asciiCodePoints = new Range(MIN_CODE_POINT, MAX_ASCII_CODE_POINT);

export class CharSet {
    public static readonly MIN_CODE_POINT = MIN_CODE_POINT;
    public static readonly MAX_CODE_POINT = MAX_CODE_POINT;
    public static readonly MAX_ASCII_CODE_POINT = MAX_ASCII_CODE_POINT;

    private static _empty: CharSet | undefined;
    private static _any: CharSet | undefined;
    private static _ascii: CharSet | undefined;

    private _root: Node | null;
    private _codePointRangeCount = -1;
    private _codePointCount = -1;
    private _characterClass: string | null = null;

    constructor(serialized?: ReadonlyArray<number>) {
        this._root = serialized ? deserialize(serialized, anyCodePoint) : null;
    }

    /**
     * Gets the number of ranges in the CharSet.
     */
    public get codePointRangeCount() {
        return this._codePointRangeCount !== -1
            ? this._codePointRangeCount
            : this._codePointRangeCount = size(this._root);
    }

    /**
     * Gets the total number of code points included in the CharSet.
     */
    public get codePointCount() {
        return this._codePointCount !== -1
            ? this._codePointCount
            : this._codePointCount = rangeSize(this._root);
    }

    /**
     * Gets a regular expression character class fragment consisting of the characters in the set.
     */
    public get characterClass(): string {
        if (this._characterClass === null) {
            let characterClass = "[";
            for (const range of iterate(this._root)) {
                characterClass += range.size === 0
                    ? `\\u{${range.start.toString(16)}}`
                    : `\\u{${range.start.toString(16)}}-\\u{${range.end.toString(16)}}`;
            }
            this._characterClass = characterClass + "]";
        }
        return this._characterClass;
    }

    /**
     * Creates an empty CharSet
     */
    public static empty() {
        return this._empty || (this._empty = CharSet._create(null));
    }

    /**
     * Creates a CharSet containing any character
     */
    public static any() {
        return this._any || (this._any = CharSet._create(new Node(null, anyCodePoint, null)));
    }

    /**
     * Creates a CharSet containing any ASCII character
     */
    public static ascii() {
        return this._ascii || (this._ascii = CharSet._create(new Node(null, asciiCodePoints, null)));
    }

    /**
     * Creates a CharSet for the specified range of code points
     */
    public static range(fromCodePoint: number, toCodePoint: number) {
        return CharSet._create(new Node(null, new Range(anyCodePoint.clamp(fromCodePoint), anyCodePoint.clamp(toCodePoint)), null));
    }

    /**
     * Creates a CharSet from an iterable consisting of a mix of code points, code point ranges, and CharSets.
     */
    public static from(iterable: Iterable<number | [number, number] | CharSet>) {
        let root: Node | null = null;
        for (const value of iterable) {
            if (typeof value === "number") {
                root = insert(root, new Range(anyCodePoint.clamp(value)));
            }
            else if (Array.isArray(value)) {
                if (value.length !== 2 ||
                    typeof value[0] !== "number" ||
                    typeof value[1] !== "number") {
                    throw new TypeError();
                }
                root = insert(root, anyCodePoint.clamp(new Range(value[0], value[1])));
            }
            else {
                root = union(root, value._root);
            }
        }

        return CharSet._create(root);
    }

    public static of(...args: (number | [number, number] | CharSet)[]) {
        return CharSet.from(args);
    }

    /**
     * Determines whether the CharSet contains the specified code point
     */
    public has(codePoint: number) {
        return anyCodePoint.contains(codePoint)
            && search(this._root, codePoint) !== null;
    }

    /**
     * Creates a new CharSet that is the union of this CharSet and the other supplied CharSets.
     */
    public union(charSet: CharSet) {
        if (this._root === null) return charSet;
        if (charSet._root === null) return this;
        return CharSet._create(union(this._root, charSet._root));
    }

    /**
     * Creates a new CharSet that is the intersection of this CharSet and the other supplied CharSets.
     */
    public intersect(charSet: CharSet) {
        if (this._root === null) return this;
        if (charSet._root === null) return charSet;
        return CharSet._create(intersect(this._root, charSet._root));
    }

    /**
     * Creates a new CharSet that is the contents of this CharSet excluding the contents of the other supplied CharSets.
     */
    public except(charSet: CharSet) {
        if (this._root === null) return this;
        if (charSet._root === null) return this;
        return CharSet._create(difference(this._root, charSet._root));
    }

    /**
     * Creates a new CharSet that is every code point not included in this CharSet.
     */
    public invert() {
        return CharSet._create(invert(this._root, anyCodePoint));
    }

    /**
     * Determines whether this CharSet has the same code points as another CharSet.
     */
    public equals(other: CharSet) {
        return this === other || equals(this._root, other._root);
    }

    /**
     * Determines whether this CharSet is a superset of another CharSet.
     */
    public supersetOf(other: CharSet, proper = false) {
        return supersetOf(this._root, other._root, proper);
    }

    /**
     * Determines whether this CharSet is a subset of another CharSet.
     */
    public subsetOf(other: CharSet, proper = false) {
        return supersetOf(other._root, this._root, proper);
    }

    /**
     * Create an array of code point ranges where each range (in ascending order) is encoded as
     * two elements: the starting code point, and the length of the range.
     */
    public toJSON() {
        return serialize(this._root);
    }

    /**
     * Gets an iterator for every code point included in the set.
     */
    public * codePoints(): IterableIterator<number> {
        for (const range of iterate(this._root)) {
            for (let i = range.start; i <= range.end; i++) {
                yield i;
            }
        }
    }

    /**
     * Gets an iterator for every code point range (start and end), included in the set.
     */
    public * codePointRanges(): IterableIterator<[number, number]> {
        for (const range of iterate(this._root)) {
            yield [range.start, range.end];
        }
    }

    /**
     * Gets an iterator for every code point range (start and end), included in the set.
     */
    public [Symbol.iterator]() {
        return this.codePointRanges();
    }

    private static _create(root: Node | null) {
        const charSet = new CharSet();
        charSet._root = root;
        return charSet;
    }
}