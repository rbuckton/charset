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

import { CodePointRangeMap } from "./codePointRangeMap";

/**
 * A set of character ranges.
 */
export class CharSet {
    private _codePointRanges: CodePointRangeMap;
    private _characterClass: string | undefined;

    /**
     * Creates a new CharSet from a `CodePointRangeMap`
     */
    constructor(codePointRanges: CodePointRangeMap);

    /**
     * Creates a new CharSet from an array of code point ranges where each range (in ascending
     * order) is encoded as two elements: the starting code point, and the length of the range.
     */
    constructor(codePointStartLengthArray: ReadonlyArray<number>);
    constructor(codePointRanges: CodePointRangeMap | ReadonlyArray<number>) {
        this._codePointRanges = codePointRanges instanceof CodePointRangeMap
            ? codePointRanges.clone()
            : new CodePointRangeMap(codePointRanges);
    }

    /**
     * Gets the total number of code points included in the CharSet.
     */
    public get codePointCount() {
        return this._codePointRanges.codePointCount;
    }

    /**
     * Gets a regular expression character class fragment consisting of the characters in the set.
     */
    public get characterClass() {
        return this._characterClass === undefined
            ? this._characterClass = this._codePointRanges.toCharacterClass()
            : this._characterClass;
    }

    /**
     * Creates a CharSet from a set of other CharSets.
     */
    public static fromCharSets(charSets: Iterable<CharSet>) {
        const codePointRanges = new CodePointRangeMap();
        for (const charSet of charSets) {
            codePointRanges.addRanges(charSet._codePointRanges);
        }

        return new CharSet(codePointRanges);
    }

    /**
     * Determines whether a code point is contained within the CharSet.
     */
    public has(codePoint: number) {
        return this._codePointRanges.has(codePoint);
    }

    /**
     * Gets a CharSet containing every code point *not* in this CharSet.
     */
    public invert() {
        return new CharSet(this._codePointRanges.invert());
    }

    /**
     * Gets an iterator for every code point included in the set.
     */
    public * codePoints() {
        yield* this._codePointRanges.codePoints();
    }

    /**
     * Gets an iterator for every code point range (start and end), included in the set.
     */
    public * codePointRanges() {
        yield* this._codePointRanges.codePointRanges();
    }

    [Symbol.iterator]() {
        return this.codePoints();
    }
}