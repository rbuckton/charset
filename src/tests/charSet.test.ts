import { CharSet } from "../charSet";
import * as rangeTree from "../rangeTree";

describe("constructor", () => {
    it("no arguments", () => {
        const charSet = new CharSet();
        expect(charSet.codePointCount).toBe(0);
        expect(charSet.codePointRangeCount).toBe(0);
    });
    it("deserialize", () => {
        const charSet = new CharSet([0, 2]);
        expect(charSet.codePointCount).toBe(3);
        expect(charSet.codePointRangeCount).toBe(1);
    });
});

describe("empty", () => {
    it("is empty", () => {
        const charSet = CharSet.empty();
        expect(charSet.codePointCount).toBe(0);
        expect(charSet.codePointRangeCount).toBe(0);
    });
    it("repeated", () => {
        expect(CharSet.empty()).toBe(CharSet.empty());
    });
});

describe("any", () => {
    it("is correct", () => {
        const charSet = CharSet.any();
        expect(charSet.codePointCount).toBe(CharSet.MAX_CODE_POINT + 1);
        expect(charSet.codePointRangeCount).toBe(1);
    });
    it("repeated", () => {
        expect(CharSet.any()).toBe(CharSet.any());
    });
});

describe("ascii", () => {
    it("is correct", () => {
        const charSet = CharSet.ascii();
        expect(charSet.codePointCount).toBe(CharSet.MAX_ASCII_CODE_POINT + 1);
        expect(charSet.codePointRangeCount).toBe(1);
    });
    it("repeated", () => {
        expect(CharSet.ascii()).toBe(CharSet.ascii());
    });
});

it("range", () => {
    const charSet = CharSet.range(0, 10);
    expect(charSet.codePointCount).toBe(11);
    expect(charSet.codePointRangeCount).toBe(1);
})

describe("from", () => {
    it("empty", () => {
        const charSet = CharSet.from([]);
        expect(charSet.codePointCount).toBe(0);
        expect(charSet.codePointRangeCount).toBe(0);
    });
    it("code points", () => {
        const charSet = CharSet.from([0, 1, 2]);
        expect(charSet.codePointCount).toBe(3);
        expect(charSet.codePointRangeCount).toBe(1);
    });
    describe("code point ranges", () => {
        it("ok", () => {
            const charSet = CharSet.from([[0, 1], [2, 3]]);
            expect(charSet.codePointCount).toBe(4);
            expect(charSet.codePointRangeCount).toBe(1);
        });
        it("invariants", () => {
            expect(() => { CharSet.from([<any>[]]); }).toThrow(TypeError);
            expect(() => { CharSet.from([<any>["", 0]]); }).toThrow(TypeError);
            expect(() => { CharSet.from([<any>[0, ""]]); }).toThrow(TypeError);
        });
    });
    it("charSets", () => {
        const charSet = CharSet.from([
            CharSet.from([0, 1]),
            CharSet.from([2, 3])
        ]);
        expect(charSet.codePointCount).toBe(4);
        expect(charSet.codePointRangeCount).toBe(1);
    });
});

describe("of", () => {
    it("empty", () => {
        const charSet = CharSet.of();
        expect(charSet.codePointCount).toBe(0);
        expect(charSet.codePointRangeCount).toBe(0);
    });
    it("code points", () => {
        const charSet = CharSet.of(0, 1, 2);
        expect(charSet.codePointCount).toBe(3);
        expect(charSet.codePointRangeCount).toBe(1);
    });
    it("code point ranges", () => {
            const charSet = CharSet.of([0, 1], [2, 3]);
            expect(charSet.codePointCount).toBe(4);
            expect(charSet.codePointRangeCount).toBe(1);
    });
    it("charSets", () => {
        const charSet = CharSet.of(
            CharSet.from([0, 1]),
            CharSet.from([2, 3])
        );
        expect(charSet.codePointCount).toBe(4);
        expect(charSet.codePointRangeCount).toBe(1);
    });
});

describe("codePointCount", () => {
    it("repeated", () => {
        const charSet = CharSet.of(5);
        expect(charSet.codePointCount).toBe(1);
        expect(charSet.codePointCount).toBe(1);
    });
});

describe("codePointRangeCount", () => {
    it("repeated", () => {
        const charSet = CharSet.of(5);
        expect(charSet.codePointRangeCount).toBe(1);
        expect(charSet.codePointRangeCount).toBe(1);
    });
});

describe("has", () => {
    it("below MIN_CODE_POINT", () => {
        const charSet = CharSet.of(5);
        expect(charSet.has(-1)).toBe(false);
    });
    it("above MAX_CODE_POINT", () => {
        const charSet = CharSet.of(5);
        expect(charSet.has(CharSet.MAX_CODE_POINT + 1)).toBe(false);
    });
    it("out of range", () => {
        const charSet = CharSet.of(5);
        expect(charSet.has(4)).toBe(false);
    });
    it("in range", () => {
        const charSet = CharSet.of(5);
        expect(charSet.has(5)).toBe(true);
    });
});

describe("union", () => {
    it("left empty", () => {
        const left = new CharSet();
        const right = CharSet.of(5);
        expect(left.union(right)).toBe(right);
    });
    it("right empty", () => {
        const left = CharSet.of(5);
        const right = new CharSet();
        expect(left.union(right)).toBe(left);
    });
    it("both with values", () => {
        const left = CharSet.of([0, 3], [5, 7]);
        const right = CharSet.of([2, 6], 8);
        expect(left.union(right).toJSON()).toEqual([0, 8]);
    });
});

describe("intersect", () => {
    it("left empty", () => {
        const left = new CharSet();
        const right = CharSet.of(5);
        expect(left.intersect(right)).toBe(left);
    });
    it("right empty", () => {
        const left = CharSet.of(5);
        const right = new CharSet();
        expect(left.intersect(right)).toBe(right);
    });
    it("both with values", () => {
        const left = CharSet.of([0, 3], [5, 7]);
        const right = CharSet.of([2, 6], 8);
        expect(left.intersect(right).toJSON()).toEqual([2, 1, 5, 1]);
    });
});

describe("except", () => {
    it("left empty", () => {
        const left = new CharSet();
        const right = CharSet.of(5);
        expect(left.except(right)).toBe(left);
    });
    it("right empty", () => {
        const left = CharSet.of(5);
        const right = new CharSet();
        expect(left.except(right)).toBe(left);
    });
    it("both with values", () => {
        const left = CharSet.of([0, 3], [5, 7]);
        const right = CharSet.of([2, 6], 8);
        expect(left.except(right).toJSON()).toEqual([0, 1, 7, 0]);
    });
});

describe("invert", () => {
    it("empty", () => {
        const charSet = CharSet.empty();
        expect(charSet.invert().toJSON()).toEqual([0, CharSet.MAX_CODE_POINT]);
    });
    it("any", () => {
        const charSet = CharSet.any();
        expect(charSet.invert().toJSON()).toEqual([]);
    });
});

describe("equals", () => {
    it("when same reference", () => {
        const charSet = CharSet.of(5);
        expect(charSet.equals(charSet)).toBe(true);
    });
    it("when equivalent", () => {
        const left = CharSet.of(5, 6);
        const right = CharSet.of([5, 6]);
        expect(left.equals(right)).toBe(true);
    });
    it("when not equivalent", () => {
        const left = CharSet.of(5);
        const right = CharSet.of(6);
        expect(left.equals(right)).toBe(false);
    });
});

describe("supersetOf", () => {
    describe("proper=true", () => {
        it("when proper superset", () => {
            const left = CharSet.of(1, 2, 3);
            const right = CharSet.of(1, 2);
            expect(left.supersetOf(right, /*proper*/ true)).toBe(true);
        });
        it("when identical", () => {
            const left = CharSet.of(1, 2, 3);
            const right = CharSet.of(1, 2, 3);
            expect(left.supersetOf(right, /*proper*/ true)).toBe(false);
        });
        it("when not superset", () => {
            const left = CharSet.of(1, 2, 3);
            const right = CharSet.of(4, 5);
            expect(left.supersetOf(right, /*proper*/ true)).toBe(false);
        });
    });
    describe("proper=false", () => {
        it("when proper superset", () => {
            const left = CharSet.of(1, 2, 3);
            const right = CharSet.of(1, 2);
            expect(left.supersetOf(right)).toBe(true);
        });
        it("when identical", () => {
            const left = CharSet.of(1, 2, 3);
            const right = CharSet.of(1, 2, 3);
            expect(left.supersetOf(right)).toBe(true);
        });
        it("when not superset", () => {
            const left = CharSet.of(1, 2, 3);
            const right = CharSet.of(4, 5);
            expect(left.supersetOf(right)).toBe(false);
        });
    });
});

describe("subsetOf", () => {
    describe("proper=true", () => {
        it("when proper subset", () => {
            const left = CharSet.of(1, 2);
            const right = CharSet.of(1, 2, 3);
            expect(left.subsetOf(right, /*proper*/ true)).toBe(true);
        });
        it("when identical", () => {
            const left = CharSet.of(1, 2, 3);
            const right = CharSet.of(1, 2, 3);
            expect(left.subsetOf(right, /*proper*/ true)).toBe(false);
        });
        it("when not subset", () => {
            const left = CharSet.of(4, 5);
            const right = CharSet.of(1, 2, 3);
            expect(left.subsetOf(right, /*proper*/ true)).toBe(false);
        });
        });
    describe("proper=false", () => {
        it("when proper subset", () => {
            const left = CharSet.of(1, 2);
            const right = CharSet.of(1, 2, 3);
            expect(left.subsetOf(right)).toBe(true);
        });
        it("when identical", () => {
            const left = CharSet.of(1, 2, 3);
            const right = CharSet.of(1, 2, 3);
            expect(left.subsetOf(right)).toBe(true);
        });
        it("when not subset", () => {
            const left = CharSet.of(4, 5);
            const right = CharSet.of(1, 2, 3);
            expect(left.subsetOf(right)).toBe(false);
        });
    });
});

describe("characterClass", () => {
    it("ranges", () => {
        const charSet = CharSet.of(
            ["a".codePointAt(0)!, "c".codePointAt(0)!],
            "(".codePointAt(0)!,
        );
        expect(charSet.characterClass).toBe("[\\u{28}\\u{61}-\\u{63}]");
    });
    it("repeated", () => {
        const charSet = CharSet.of(5);
        expect(charSet.characterClass).toBe("[\\u{5}]");
        expect(charSet.characterClass).toBe("[\\u{5}]");
    });
});

it("codePoints", () => {
    const charSet = CharSet.of([1, 3]);
    expect([...charSet.codePoints()]).toEqual([1, 2, 3]);
});

it("codePointRanges", () => {
    const charSet = CharSet.of(1, 2, 3);
    expect([...charSet.codePointRanges()]).toEqual([[1, 3]])
});

it("Symbol.iterator", () => {
    const charSet = CharSet.of(1, 2, 3);
    expect([...charSet]).toEqual([[1, 3]])
});