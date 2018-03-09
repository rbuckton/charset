import { CharSet } from "../charSet";

describe("ctor", () => {
    it("invariants", () => {
        expect(() => { new CharSet([<any>"foo"]) }).toThrow();
    });
    it("no arguments", () => {
        const set = new CharSet();
        expect(set.size).toBe(0);
        expect(set["_debugCodePointRangeCount"]).toBe(0);
    });
    it("iterable", () => {
        const set = new CharSet([3, 5, 7, 9, [11, 11], new CharSet([13, 15])]);
        expect(set.size).toBe(7);
        expect(set["_debugCodePointRangeCount"]).toBe(7);
        expect(set.has(3)).toBe(true);
        expect(set.has(5)).toBe(true);
        expect(set.has(7)).toBe(true);
        expect(set.has(9)).toBe(true);
        expect(set.has(11)).toBe(true);
        expect(set.has(13)).toBe(true);
        expect(set.has(15)).toBe(true);
        set["_debugVerify"]();
    });
});

describe("CharSet.empty()", () => {
    it("is empty", () => {
        const charSet = CharSet.empty();
        expect(charSet.size).toBe(0);
    });
    it("repeated", () => {
        expect(CharSet.empty()).toBe(CharSet.empty());
    });
});

describe("CharSet.any()", () => {
    it("is all possible", () => {
        const charSet = CharSet.any();
        expect(charSet.size).toBe(CharSet.MAX_CODE_POINT - CharSet.MIN_CODE_POINT + 1);
    });
    it("repeated", () => {
        expect(CharSet.any()).toBe(CharSet.any());
    });
});

it("CharSet.range()", () => {
    const charSet = CharSet.range(0, 10);
    expect(charSet.size).toBe(11);
    expect(charSet["_debugCodePointRangeCount"]).toBe(1);
});

describe("from", () => {
    it("empty", () => {
        const charSet = CharSet.from([]);
        expect(charSet.size).toBe(0);
        expect(charSet["_debugCodePointRangeCount"]).toBe(0);
    });
    it("code points", () => {
        const set = CharSet.from([0, 1, 2]);
        expect(set.size).toBe(3);
        expect(set["_debugCodePointRangeCount"]).toBe(1);
        set["_debugVerify"]();
    });
    describe("code point ranges", () => {
        it("ok", () => {
            const charSet = CharSet.from([[0, 1], [2, 3]]);
            expect(charSet.size).toBe(4);
            expect(charSet["_debugCodePointRangeCount"]).toBe(1);
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
        expect(charSet.size).toBe(4);
        expect(charSet["_debugCodePointRangeCount"]).toBe(1);
    });
});

describe("of", () => {
    it("empty", () => {
        const charSet = CharSet.of();
        expect(charSet.size).toBe(0);
        expect(charSet["_debugCodePointRangeCount"]).toBe(0);
    });
    it("code points", () => {
        const charSet = CharSet.of(0, 1, 2);
        expect(charSet.size).toBe(3);
        expect(charSet["_debugCodePointRangeCount"]).toBe(1);
    });
    it("code point ranges", () => {
            const charSet = CharSet.of([0, 1], [2, 3]);
            expect(charSet.size).toBe(4);
            expect(charSet["_debugCodePointRangeCount"]).toBe(1);
    });
    it("charSets", () => {
        const charSet = CharSet.of(
            CharSet.from([0, 1]),
            CharSet.from([2, 3])
        );
        expect(charSet.size).toBe(4);
        expect(charSet["_debugCodePointRangeCount"]).toBe(1);
    });
});

describe("CharSet.fromStartLengthArray()", () => {
    it("invariants", () => {
        expect(() => { CharSet.fromStartLengthArray([0]); }).toThrow();
        expect(() => { CharSet.fromStartLengthArray([2,0, 0,0]); }).toThrow();
        expect(() => { CharSet.fromStartLengthArray([0,0, 5,0, 10,0, 15,0, 13,0]); }).toThrow();
        expect(() => { CharSet.fromStartLengthArray([0,0, 5,0, 3,0, 15,0, 20,0, 25,0, 30,0]); }).toThrow();
    });
    it("empty array", () => {
        const set = CharSet.fromStartLengthArray([]);
        expect(set.size).toBe(0);
        expect(set["_debugCodePointRangeCount"]).toBe(0);
        set["_debugVerify"]();
    });
    it("simple array", () => {
        const set = CharSet.fromStartLengthArray([0, 2]);
        expect(set.size).toBe(3);
        expect(set["_debugCodePointRangeCount"]).toBe(1);
        set["_debugVerify"]();
    });
    it("complex array", () => {
        const set = CharSet.fromStartLengthArray([0,2, 5,2, 10,2, 15,2, 20,2]);
        expect(set.size).toBe(15);
        expect(set["_debugCodePointRangeCount"]).toBe(5);
        set["_debugVerify"]();
    });
});

describe("add", () => {
    it("invariants", () => {
        const set = new CharSet();
        expect(() => { set.add(<any>""); }).toThrow();
        expect(() => { set.add(<any>[]); }).toThrow();
        expect(() => { set.add(<any>["", 0]); }).toThrow();
        expect(() => { set.add(<any>[0, ""]); }).toThrow();
        Object.freeze(set);
        expect(() => { set.add(0); }).toThrow();
    });
    it("root", () => {
        const set = new CharSet();
        set.add(5);
        expect(set.size).toBe(1);
        expect(set["_debugCodePointRangeCount"]).toBe(1);
        expect(set.has(5)).toBe(true);
        set["_debugVerify"]();
    });
    it("left", () => {
        const set = new CharSet();
        set.add(7);
        set.add(5);
        expect(set.size).toBe(2);
        expect(set["_debugCodePointRangeCount"]).toBe(2);
        expect(set.has(7)).toBe(true);
        expect(set.has(5)).toBe(true);
        set["_debugVerify"]();
    });
    it("left heavy", () => {
        const set = new CharSet();
        set.add(7);
        set.add(5);
        set.add(3);
        expect(set.size).toBe(3);
        expect(set["_debugCodePointRangeCount"]).toBe(3);
        expect(set.has(7)).toBe(true);
        expect(set.has(5)).toBe(true);
        expect(set.has(3)).toBe(true);
        set["_debugVerify"]();
    });
    it("right", () => {
        const set = new CharSet();
        set.add(7);
        set.add(9);
        expect(set.size).toBe(2);
        expect(set["_debugCodePointRangeCount"]).toBe(2);
        expect(set.has(7)).toBe(true);
        expect(set.has(9)).toBe(true);
        set["_debugVerify"]();
    });
    it("right heavy", () => {
        const set = new CharSet();
        set.add(7);
        set.add(9);
        set.add(11);
        expect(set.size).toBe(3);
        expect(set["_debugCodePointRangeCount"]).toBe(3);
        expect(set.has(7)).toBe(true);
        expect(set.has(9)).toBe(true);
        expect(set.has(11)).toBe(true);
        set["_debugVerify"]();
    });
    it("overlap left", () => {
        const set = new CharSet();
        set.add(9);
        set.add(7);
        set.add(11);
        set.add(7, 9);
        expect(set.size).toBe(4);
        expect(set["_debugCodePointRangeCount"]).toBe(2);
        expect(set.has(7)).toBe(true);
        expect(set.has(8)).toBe(true);
        expect(set.has(9)).toBe(true);
        expect(set.has(11)).toBe(true);
        set["_debugVerify"]();
    });
    it("overlap right", () => {
        const set = new CharSet();
        set.add(9);
        set.add(7);
        set.add(11);
        set.add(9, 11);
        expect(set.size).toBe(4);
        expect(set["_debugCodePointRangeCount"]).toBe(2);
        expect(set.has(7)).toBe(true);
        expect(set.has(9)).toBe(true);
        expect(set.has(11)).toBe(true);
        expect(set.has(10)).toBe(true);
        set["_debugVerify"]();
    });
    it("overlap mixed", () => {
        const set = new CharSet();
        set.add(3);
        set.add(5);
        set.add(7);
        set.add(9);
        set.add(11);
        set.add(13);
        set.add(7, 11);
        expect(set.size).toBe(8);
        expect(set["_debugCodePointRangeCount"]).toBe(4);
        expect(set.has(3)).toBe(true);
        expect(set.has(5)).toBe(true);
        expect(set.has(7)).toBe(true);
        expect(set.has(9)).toBe(true);
        expect(set.has(8)).toBe(true);
        expect(set.has(11)).toBe(true);
        expect(set.has(13)).toBe(true);
        set["_debugVerify"]();
    });
    it("adjacent on left", () => {
        const set = new CharSet();
        set.add(3);
        set.add(4);
        expect(set.size).toBe(2);
        expect(set["_debugCodePointRangeCount"]).toBe(1);
        expect(set.has(3)).toBe(true);
        expect(set.has(4)).toBe(true);
        set["_debugVerify"]();
    });
    it("left-right rotation", () => {
        const set = new CharSet([15, 11, 13, 7, 9, 3, 5]);
        expect(set.size).toBe(7);
        set["_debugVerify"]();
    });
    it("right-left rotation", () => {
        const set = new CharSet([1, 5, 3, 9, 7, 13, 11]);
        expect(set.size).toBe(7);
        set["_debugVerify"]();
    });
    it("sequential", () => {
        const set = new CharSet();
        set.add(0);
        set.add(1);
        set.add(2);
        expect(set.size).toBe(3);
    });
    it("empty CharSet", () => {
        const set = new CharSet();
        set.add(CharSet.empty());
        expect(set.size).toBe(0);
    });
    it("single range CharSet", () => {
        const set = new CharSet();
        set.add(CharSet.range(1, 2));
        expect(set.size).toBe(2);
    });
    it("multiple range CharSet", () => {
        const set = new CharSet();
        set.add(CharSet.from([[1, 2], [4, 5]]));
        expect(set.size).toBe(4);
    });
});

describe("delete", () => {
    it("invariants", () => {
        const set = new CharSet();
        expect(() => { set.delete(<any>""); }).toThrow();
        expect(() => { set.delete(<any>[]); }).toThrow();
        expect(() => { set.delete(<any>["", 0]); }).toThrow();
        expect(() => { set.delete(<any>[0, ""]); }).toThrow();
        Object.freeze(set);
        expect(() => { set.delete(0); }).toThrow();
    });
    it("left leaf", () => {
        const set = new CharSet([3, 5, 7, 9, 11, 13, 15]);
        expect(set.delete(3)).toBe(true);
        expect(set.size).toBe(6);
        expect(set["_debugCodePointRangeCount"]).toBe(6);
        expect(set.has(3)).toBe(false);
        expect(set.has(5)).toBe(true);
        expect(set.has(7)).toBe(true);
        expect(set.has(9)).toBe(true);
        expect(set.has(11)).toBe(true);
        expect(set.has(13)).toBe(true);
        expect(set.has(15)).toBe(true);
        set["_debugVerify"]();
    });
    it("left branch", () => {
        const set = new CharSet([3, 5, 7, 9, 11, 13, 15]);
        expect(set.delete(5)).toBe(true);
        expect(set.size).toBe(6);
        expect(set["_debugCodePointRangeCount"]).toBe(6);
        expect(set.has(3)).toBe(true);
        expect(set.has(5)).toBe(false);
        expect(set.has(7)).toBe(true);
        expect(set.has(9)).toBe(true);
        expect(set.has(11)).toBe(true);
        expect(set.has(13)).toBe(true);
        expect(set.has(15)).toBe(true);
        set["_debugVerify"]();
    });
    it("right leaf", () => {
        const set = new CharSet([3, 5, 7, 9, 11, 13, 15]);
        expect(set.delete(11)).toBe(true);
        expect(set.size).toBe(6);
        expect(set["_debugCodePointRangeCount"]).toBe(6);
        expect(set.has(3)).toBe(true);
        expect(set.has(5)).toBe(true);
        expect(set.has(7)).toBe(true);
        expect(set.has(9)).toBe(true);
        expect(set.has(11)).toBe(false);
        expect(set.has(13)).toBe(true);
        expect(set.has(15)).toBe(true);
        set["_debugVerify"]();
    });
    it("right branch", () => {
        const set = new CharSet([3, 5, 7, 9, 11, 13, 15]);
        expect(set.delete(13)).toBe(true);
        expect(set.size).toBe(6);
        expect(set["_debugCodePointRangeCount"]).toBe(6);
        expect(set.has(3)).toBe(true);
        expect(set.has(5)).toBe(true);
        expect(set.has(7)).toBe(true);
        expect(set.has(9)).toBe(true);
        expect(set.has(11)).toBe(true);
        expect(set.has(13)).toBe(false);
        expect(set.has(15)).toBe(true);
        set["_debugVerify"]();
    });
    it("leading", () => {
        const set = new CharSet([[1, 5]]);
        expect(set.delete(1, 3)).toBe(true);
        expect(set.size).toBe(2);
        expect(set["_debugCodePointRangeCount"]).toBe(1);
        expect(set.has(1)).toBe(false);
        expect(set.has(3)).toBe(false);
        expect(set.has(4)).toBe(true);
        expect(set.has(5)).toBe(true);
        set["_debugVerify"]();
    });
    it("trailing", () => {
        const set = new CharSet([[1, 5]]);
        expect(set.delete(3, 5)).toBe(true);
        expect(set.size).toBe(2);
        expect(set["_debugCodePointRangeCount"]).toBe(1);
        expect(set.has(1)).toBe(true);
        expect(set.has(2)).toBe(true);
        expect(set.has(5)).toBe(false);
        set["_debugVerify"]();
    });
    it("overlap leading", () => {
        const set = new CharSet([1, [3, 5]]);
        expect(set.delete(1, 3)).toBe(true);
        expect(set.size).toBe(2);
        expect(set["_debugCodePointRangeCount"]).toBe(1);
        expect(set.has(1)).toBe(false);
        expect(set.has(4)).toBe(true);
        expect(set.has(5)).toBe(true);
        set["_debugVerify"]();
    });
    it("overlap trailing", () => {
        const set = new CharSet([[1, 3], 5]);
        expect(set.delete(3, 5)).toBe(true);
        expect(set.size).toBe(2);
        expect(set["_debugCodePointRangeCount"]).toBe(1);
        expect(set.has(1)).toBe(true);
        expect(set.has(2)).toBe(true);
        expect(set.has(5)).toBe(false);
        set["_debugVerify"]();
    });
    it("overlap leading and in between", () => {
        const set = new CharSet([1, 3, [5, 7]]);
        expect(set.delete(1, 5)).toBe(true);
        expect(set.size).toBe(2);
        expect(set["_debugCodePointRangeCount"]).toBe(1);
        expect(set.has(1)).toBe(false);
        expect(set.has(3)).toBe(false);
        expect(set.has(6)).toBe(true);
        expect(set.has(7)).toBe(true);
        set["_debugVerify"]();
    });
    it("overlap trailing and in between", () => {
        const set = new CharSet([[1, 3], 5, 7]);
        expect(set.delete(3, 7)).toBe(true);
        expect(set.size).toBe(2);
        expect(set["_debugCodePointRangeCount"]).toBe(1);
        expect(set.has(1)).toBe(true);
        expect(set.has(2)).toBe(true);
        expect(set.has(5)).toBe(false);
        expect(set.has(7)).toBe(false);
        set["_debugVerify"]();
    });
    it("bisect", () => {
        const set = new CharSet([[1, 7]]);
        expect(set.delete(3, 5)).toBe(true);
        expect(set.size).toBe(4);
        expect(set["_debugCodePointRangeCount"]).toBe(2);
        expect(set.has(1)).toBe(true);
        expect(set.has(2)).toBe(true);
        expect(set.has(3)).toBe(false);
        expect(set.has(4)).toBe(false);
        expect(set.has(5)).toBe(false);
        expect(set.has(6)).toBe(true);
        expect(set.has(7)).toBe(true);
        set["_debugVerify"]();
    });
    it("non existent", () => {
        const set = new CharSet([3]);
        expect(set.delete(4)).toBe(false);
        expect(set.size).toBe(1);
    });
    it("range", () => {
        const set = new CharSet([3]);
        expect(set.delete(2, 4)).toBe(true);
        expect(set.size).toBe(0);
    });
    it("range ([start, end])", () => {
        const set = new CharSet([3]);
        expect(set.delete([2, 4])).toBe(true);
        expect(set.size).toBe(0);
    });
    it("empty CharSet", () => {
        const set = new CharSet([3]);
        set.delete(CharSet.empty());
        expect(set.size).toBe(1);
    });
    it("single range CharSet", () => {
        const set = new CharSet([3]);
        set.delete(CharSet.range(2, 4));
        expect(set.size).toBe(0);
    });
    it("multiple range CharSet", () => {
        const set = new CharSet([3, 7]);
        set.delete(CharSet.from([[2, 4], [6, 8]]));
        expect(set.size).toBe(0);
    });
});

describe("has", () => {
    it("invariants", () => {
        const set = new CharSet();
        expect(() => { set.has(<any>""); }).toThrow();
        expect(() => { set.has(<any>[]); }).toThrow();
        expect(() => { set.has(<any>["", 0]); }).toThrow();
        expect(() => { set.has(<any>[0, ""]); }).toThrow();
    });
    it("code point exists and less than root", () => {
        const set = new CharSet([1, 3, 5]);
        expect(set.has(1)).toBe(true);
    });
    it("code point exists and greater than root", () => {
        const set = new CharSet([1, 3, 5]);
        expect(set.has(5)).toBe(true);
    });
    it("code point missing and less than root", () => {
        const set = new CharSet([1, 3, 5]);
        expect(set.has(2)).toBe(false);
    });
    it("code point missing and greater than root", () => {
        const set = new CharSet([1, 3, 5]);
        expect(set.has(4)).toBe(false);
    });
    it("code point range exists and less than root", () => {
        const set = new CharSet([[1, 3], 5, 7]);
        expect(set.has(2, 3)).toBe(true);
    });
    it("code point range exists and less than root ([start, end])", () => {
        const set = new CharSet([[1, 3], 5, 7]);
        expect(set.has([2, 3])).toBe(true);
    });
    it("code point range exists and less than root (CharSet)", () => {
        const set = new CharSet([[1, 3], 5, 7]);
        expect(set.has(new CharSet([2, 3]))).toBe(true);
    });
    it("code point range exists and greater than root", () => {
        const set = new CharSet([1, 3, [5, 7]]);
        expect(set.has(5, 6)).toBe(true);
    });
    it("code point range partially exists", () => {
        const set = new CharSet([1, 3, [5, 7]]);
        expect(set.has(4, 5)).toBe(false);
    });
});

describe("clear", () => {
    it("invariants", () => {
        const set = new CharSet();
        Object.freeze(set);
        expect(() => { set.clear(); }).toThrow();
    });
    it("clears", () => {
        const set = new CharSet([1, 2]);
        set.clear();
        expect(set.size).toBe(0);
    });
});

describe("union", () => {
    it("invariants", () => {
        const set = new CharSet();
        expect(() => { set.union(<any>""); }).toThrow();
    });
    it("left empty", () => {
        const left = new CharSet();
        const right = new CharSet([5]);
        const set = left.union(right);
        expect(left.size).toBe(0);
        expect(left["_debugCodePointRangeCount"]).toBe(0);
        expect(right.size).toBe(1);
        expect(right["_debugCodePointRangeCount"]).toBe(1);
        expect(set.size).toBe(1);
        expect(set["_debugCodePointRangeCount"]).toBe(1);
        expect(set.has(5)).toBe(true);
        left["_debugVerify"]();
        right["_debugVerify"]();
        set["_debugVerify"]();
    });
    it("right empty", () => {
        const left = new CharSet([5]);
        const right = new CharSet();
        const set = left.union(right);
        expect(left.size).toBe(1);
        expect(left["_debugCodePointRangeCount"]).toBe(1);
        expect(right.size).toBe(0);
        expect(right["_debugCodePointRangeCount"]).toBe(0);
        expect(set.size).toBe(1);
        expect(set["_debugCodePointRangeCount"]).toBe(1);
        expect(set.has(5)).toBe(true);
        left["_debugVerify"]();
        right["_debugVerify"]();
        set["_debugVerify"]();
    });
    it("no overlap", () => {
        const left = new CharSet([5]);
        const right = new CharSet([7]);
        const set = left.union(right);
        expect(left.size).toBe(1);
        expect(left["_debugCodePointRangeCount"]).toBe(1);
        expect(right.size).toBe(1);
        expect(right["_debugCodePointRangeCount"]).toBe(1);
        expect(set.size).toBe(2);
        expect(set["_debugCodePointRangeCount"]).toBe(2);
        expect(set.has(5)).toBe(true);
        expect(set.has(7)).toBe(true);
        left["_debugVerify"]();
        right["_debugVerify"]();
        set["_debugVerify"]();
    });
    it("shared", () => {
        const left = new CharSet([3, 5]);
        const right = new CharSet([5, 7]);
        const set = left.union(right);
        expect(left.size).toBe(2);
        expect(left["_debugCodePointRangeCount"]).toBe(2);
        expect(right.size).toBe(2);
        expect(right["_debugCodePointRangeCount"]).toBe(2);
        expect(set.size).toBe(3);
        expect(set["_debugCodePointRangeCount"]).toBe(3);
        expect(set.has(3)).toBe(true);
        expect(set.has(5)).toBe(true);
        expect(set.has(7)).toBe(true);
        left["_debugVerify"]();
        right["_debugVerify"]();
        set["_debugVerify"]();
    });
    it("overlapping", () => {
        const left = new CharSet([[3, 5]]);
        const right = new CharSet([[5, 7]]);
        const set = left.union(right);
        expect(left.size).toBe(3);
        expect(left["_debugCodePointRangeCount"]).toBe(1);
        expect(right.size).toBe(3);
        expect(right["_debugCodePointRangeCount"]).toBe(1);
        expect(set.size).toBe(5);
        expect(set["_debugCodePointRangeCount"]).toBe(1);
        expect(set.has(3)).toBe(true);
        expect(set.has(4)).toBe(true);
        expect(set.has(5)).toBe(true);
        expect(set.has(6)).toBe(true);
        expect(set.has(7)).toBe(true);
        left["_debugVerify"]();
        right["_debugVerify"]();
        set["_debugVerify"]();
    });
});

describe("intersect", () => {
    it("invariants", () => {
        const set = new CharSet();
        expect(() => { set.intersect(<any>""); }).toThrow();
    });
    it("left empty", () => {
        const left = new CharSet();
        const right = new CharSet([5]);
        const set = left.intersect(right);
        expect(left.size).toBe(0);
        expect(left["_debugCodePointRangeCount"]).toBe(0);
        expect(right.size).toBe(1);
        expect(right["_debugCodePointRangeCount"]).toBe(1);
        expect(set.size).toBe(0);
        expect(set["_debugCodePointRangeCount"]).toBe(0);
        left["_debugVerify"]();
        right["_debugVerify"]();
        set["_debugVerify"]();
    });
    it("right empty", () => {
        const left = new CharSet([5]);
        const right = new CharSet();
        const set = left.intersect(right);
        expect(left.size).toBe(1);
        expect(left["_debugCodePointRangeCount"]).toBe(1);
        expect(right.size).toBe(0);
        expect(right["_debugCodePointRangeCount"]).toBe(0);
        expect(set.size).toBe(0);
        expect(set["_debugCodePointRangeCount"]).toBe(0);
        left["_debugVerify"]();
        right["_debugVerify"]();
        set["_debugVerify"]();
    });
    it("no overlap", () => {
        const left = new CharSet([5]);
        const right = new CharSet([7]);
        const set = left.intersect(right);
        expect(left.size).toBe(1);
        expect(left["_debugCodePointRangeCount"]).toBe(1);
        expect(right.size).toBe(1);
        expect(right["_debugCodePointRangeCount"]).toBe(1);
        expect(set.size).toBe(0);
        expect(set["_debugCodePointRangeCount"]).toBe(0);
        left["_debugVerify"]();
        right["_debugVerify"]();
        set["_debugVerify"]();
    });
    it("shared", () => {
        const left = new CharSet([3, 5]);
        const right = new CharSet([5, 7]);
        const set = left.intersect(right);
        expect(left.size).toBe(2);
        expect(left["_debugCodePointRangeCount"]).toBe(2);
        expect(right.size).toBe(2);
        expect(right["_debugCodePointRangeCount"]).toBe(2);
        expect(set.size).toBe(1);
        expect(set["_debugCodePointRangeCount"]).toBe(1);
        expect(set.has(5)).toBe(true);
        left["_debugVerify"]();
        right["_debugVerify"]();
        set["_debugVerify"]();
    });
    it("overlapping", () => {
        const left = new CharSet([[3, 5]]);
        const right = new CharSet([[5, 7]]);
        const set = left.intersect(right);
        expect(left.size).toBe(3);
        expect(left["_debugCodePointRangeCount"]).toBe(1);
        expect(right.size).toBe(3);
        expect(right["_debugCodePointRangeCount"]).toBe(1);
        expect(set.size).toBe(1);
        expect(set["_debugCodePointRangeCount"]).toBe(1);
        expect(set.has(5)).toBe(true);
        left["_debugVerify"]();
        right["_debugVerify"]();
        set["_debugVerify"]();
    });
    it("overlapping 2", () => {
        const left = new CharSet([[0, 3], [5, 7]]);
        const right = new CharSet([[2, 6]]);
        const set = left.intersect(right);
        expect(left.size).toBe(7);
        expect(left["_debugCodePointRangeCount"]).toBe(2);
        expect(right.size).toBe(5);
        expect(right["_debugCodePointRangeCount"]).toBe(1);
        expect(set.size).toBe(4);
        expect(set["_debugCodePointRangeCount"]).toBe(2);
        expect(set.has(2)).toBe(true);
        expect(set.has(3)).toBe(true);
        expect(set.has(5)).toBe(true);
        expect(set.has(6)).toBe(true);
        left["_debugVerify"]();
        right["_debugVerify"]();
        set["_debugVerify"]();
    });
});

describe("except", () => {
    it("invariants", () => {
        const set = new CharSet();
        expect(() => { set.except(<any>""); }).toThrow();
    });
    it("left empty", () => {
        const left = new CharSet();
        const right = new CharSet([5]);
        const set = left.except(right);
        expect(left.size).toBe(0);
        expect(left["_debugCodePointRangeCount"]).toBe(0);
        expect(right.size).toBe(1);
        expect(right["_debugCodePointRangeCount"]).toBe(1);
        expect(set.size).toBe(0);
        expect(set["_debugCodePointRangeCount"]).toBe(0);
        left["_debugVerify"]();
        right["_debugVerify"]();
        set["_debugVerify"]();
    });
    it("right empty", () => {
        const left = new CharSet([5]);
        const right = new CharSet();
        const set = left.except(right);
        expect(left.size).toBe(1);
        expect(left["_debugCodePointRangeCount"]).toBe(1);
        expect(right.size).toBe(0);
        expect(right["_debugCodePointRangeCount"]).toBe(0);
        expect(set.size).toBe(1);
        expect(set["_debugCodePointRangeCount"]).toBe(1);
        expect(set.has(5)).toBe(true);
        left["_debugVerify"]();
        right["_debugVerify"]();
        set["_debugVerify"]();
    });
    it("no overlap", () => {
        const left = new CharSet([5]);
        const right = new CharSet([7]);
        const set = left.except(right);
        expect(left.size).toBe(1);
        expect(left["_debugCodePointRangeCount"]).toBe(1);
        expect(right.size).toBe(1);
        expect(right["_debugCodePointRangeCount"]).toBe(1);
        expect(set.size).toBe(1);
        expect(set["_debugCodePointRangeCount"]).toBe(1);
        expect(set.has(5)).toBe(true);
        left["_debugVerify"]();
        right["_debugVerify"]();
        set["_debugVerify"]();
    });
    it("shared", () => {
        const left = new CharSet([3, 5]);
        const right = new CharSet([5, 7]);
        const set = left.except(right);
        expect(left.size).toBe(2);
        expect(left["_debugCodePointRangeCount"]).toBe(2);
        expect(right.size).toBe(2);
        expect(right["_debugCodePointRangeCount"]).toBe(2);
        expect(set.size).toBe(1);
        expect(set["_debugCodePointRangeCount"]).toBe(1);
        expect(set.has(3)).toBe(true);
        expect(set.has(5)).toBe(false);
        left["_debugVerify"]();
        right["_debugVerify"]();
        set["_debugVerify"]();
    });
    it("overlapping", () => {
        const left = new CharSet([[3, 5]]);
        const right = new CharSet([[5, 7]]);
        const set = left.except(right);
        expect(left.size).toBe(3);
        expect(left["_debugCodePointRangeCount"]).toBe(1);
        expect(right.size).toBe(3);
        expect(right["_debugCodePointRangeCount"]).toBe(1);
        expect(set.size).toBe(2);
        expect(set["_debugCodePointRangeCount"]).toBe(1);
        expect(set.has(3)).toBe(true);
        expect(set.has(4)).toBe(true);
        expect(set.has(5)).toBe(false);
        left["_debugVerify"]();
        right["_debugVerify"]();
        set["_debugVerify"]();
    });
});

describe("invert", () => {
    it("empty", () => {
        const set = CharSet.empty().invert();
        expect(set.size).toBe(CharSet.MAX_CODE_POINT + 1);
    });
    it("any", () => {
        const set = CharSet.any().invert();
        expect(set.size).toBe(0);
    });
});

describe("equals", () => {
    it("invariants", () => {
        const set = new CharSet();
        expect(() => { set.equals(<any>""); }).toThrow();
    });
    it("comparing empties", () => {
        const left = new CharSet();
        const right = new CharSet();
        expect(left.equals(right)).toBe(true);
    });
    it("left empty", () => {
        const left = new CharSet();
        const right = new CharSet([3]);
        expect(left.equals(right)).toBe(false);
    });
    it("right empty", () => {
        const left = new CharSet([3]);
        const right = new CharSet();
        expect(left.equals(right)).toBe(false);
    });
    it("same reference", () => {
        const left = new CharSet();
        expect(left.equals(left)).toBe(true);
    });
    it("same values, different structures", () => {
        const left = new CharSet([3, 5]);
        const right = new CharSet([5, 3]);
        expect(left.equals(right)).toBe(true);
    });
    it("not equal", () => {
        const left = new CharSet([3]);
        const right = new CharSet([5]);
        expect(left.equals(right)).toBe(false);
    });
    it("deep", () => {
        const left = new CharSet([3, 5, 7, 9, 11, 13]);
        const right = new CharSet([3, 5, 7, 9, 11, 13]);
        expect(left.equals(right)).toBe(true);
    });
});

describe("supersetOf", () => {
    it("invariants", () => {
        const set = new CharSet();
        expect(() => { set.supersetOf(<any>""); }).toThrow();
    });
    it("is superset (same reference)", () => {
        const left = new CharSet([3, 5, 7]);
        expect(left.supersetOf(left, /*proper*/ false)).toBe(true);
    });
    it("is superset (same structure, same values)", () => {
        const left = new CharSet([3, 5, 7]);
        const right = new CharSet([3, 5, 7]);
        expect(left.supersetOf(right, /*proper*/ false)).toBe(true);
    });
    it("is superset (with ranges)", () => {
        const left = new CharSet([[3, 5], 7]);
        const right = new CharSet([3, 5, 7]);
        expect(left.supersetOf(right, /*proper*/ false)).toBe(true);
    });
    it("is superset (different structure, same values)", () => {
        const left = new CharSet([3, 7]);
        const right = new CharSet([7, 3]);
        expect(left.supersetOf(right, /*proper*/ false)).toBe(true);
    });
    it("is superset (smaller right)", () => {
        const left = new CharSet([3, 5, 7]);
        const right = new CharSet([3, 5]);
        expect(left.supersetOf(right, /*proper*/ false)).toBe(true);
    });
    it("is proper superset (same structure, same values)", () => {
        const left = new CharSet([3, 5, 7]);
        const right = new CharSet([3, 5, 7]);
        expect(left.supersetOf(right, /*proper*/ true)).toBe(false);
    });
    it("is proper superset (same reference)", () => {
        const left = new CharSet([3, 5, 7]);
        expect(left.supersetOf(left, /*proper*/ true)).toBe(false);
    });
    it("is proper superset (different structure, same values)", () => {
        const left = new CharSet([3, 7]);
        const right = new CharSet([7, 3]);
        expect(left.supersetOf(right, /*proper*/ true)).toBe(false);
    });
    it("is proper superset (smaller right)", () => {
        const left = new CharSet([3, 5, 7]);
        const right = new CharSet([3, 5]);
        expect(left.supersetOf(right, /*proper*/ true)).toBe(true);
    });
    it("is not superset", () => {
        const left = new CharSet([3, 5]);
        const right = new CharSet([3, 7]);
        expect(left.supersetOf(right, /*proper*/ false)).toBe(false);
    });
    it("is not superset (with ranges)", () => {
        const left = new CharSet([3, 5]);
        const right = new CharSet([[3, 7]]);
        expect(left.supersetOf(right, /*proper*/ false)).toBe(false);
    });
    it("at least one code point is superset of empty", () => {
        const left = new CharSet([0]);
        const right = new CharSet();
        expect(left.supersetOf(right, /*proper*/ false)).toBe(true);
    });
    it("empty is superset of empty", () => {
        const left = new CharSet();
        const right = new CharSet();
        expect(left.supersetOf(right, /*proper*/ false)).toBe(true);
    });
    it("empty is not proper superset of empty", () => {
        const left = new CharSet();
        const right = new CharSet();
        expect(left.supersetOf(right, /*proper*/ true)).toBe(false);
    });
    it("empty is not superset of non-empty", () => {
        const left = new CharSet();
        const right = new CharSet([3]);
        expect(left.supersetOf(right, /*proper*/ false)).toBe(false);
    });
    it("empty is not proper superset of non-empty", () => {
        const left = new CharSet();
        const right = new CharSet([3]);
        expect(left.supersetOf(right, /*proper*/ true)).toBe(false);
    });
});

describe("subsetOf", () => {
    it("invariants", () => {
        const set = new CharSet();
        expect(() => { set.subsetOf(<any>""); }).toThrow();
    });
    it("is subset (same reference)", () => {
        const left = new CharSet([3, 5, 7]);
        expect(left.subsetOf(left, /*proper*/ false)).toBe(true);
    });
    it("is subset (same structure, same values)", () => {
        const left = new CharSet([3, 5, 7]);
        const right = new CharSet([3, 5, 7]);
        expect(left.subsetOf(right, /*proper*/ false)).toBe(true);
    });
    it("is subset (with ranges)", () => {
        const left = new CharSet([3, 5, 7]);
        const right = new CharSet([[3, 5], 7]);
        expect(left.subsetOf(right, /*proper*/ false)).toBe(true);
    });
    it("is subset (different structure, same values)", () => {
        const left = new CharSet([7, 3]);
        const right = new CharSet([3, 7]);
        expect(left.subsetOf(right, /*proper*/ false)).toBe(true);
    });
    it("is subset (smaller right)", () => {
        const left = new CharSet([3, 5]);
        const right = new CharSet([3, 5, 7]);
        expect(left.subsetOf(right, /*proper*/ false)).toBe(true);
    });
    it("is proper subset (same structure, same values)", () => {
        const left = new CharSet([3, 5, 7]);
        const right = new CharSet([3, 5, 7]);
        expect(left.subsetOf(right, /*proper*/ true)).toBe(false);
    });
    it("is proper subset (same reference)", () => {
        const left = new CharSet([3, 5, 7]);
        expect(left.subsetOf(left, /*proper*/ true)).toBe(false);
    });
    it("is proper subset (different structure, same values)", () => {
        const left = new CharSet([7, 3]);
        const right = new CharSet([3, 7]);
        expect(left.subsetOf(right, /*proper*/ true)).toBe(false);
    });
    it("is proper subset (smaller right)", () => {
        const left = new CharSet([3, 5]);
        const right = new CharSet([3, 5, 7]);
        expect(left.subsetOf(right, /*proper*/ true)).toBe(true);
    });
    it("is not subset", () => {
        const left = new CharSet([3, 7]);
        const right = new CharSet([3, 5]);
        expect(left.subsetOf(right, /*proper*/ false)).toBe(false);
    });
    it("is not subset (with ranges)", () => {
        const left = new CharSet([[3, 7]]);
        const right = new CharSet([3, 5]);
        expect(left.subsetOf(right, /*proper*/ false)).toBe(false);
    });
    it("at least one code point is subset of empty", () => {
        const left = new CharSet();
        const right = new CharSet([0]);
        expect(left.subsetOf(right, /*proper*/ false)).toBe(true);
    });
    it("empty is subset of empty", () => {
        const left = new CharSet();
        const right = new CharSet();
        expect(left.subsetOf(right, /*proper*/ false)).toBe(true);
    });
    it("empty is not proper subset of empty", () => {
        const left = new CharSet();
        const right = new CharSet();
        expect(left.subsetOf(right, /*proper*/ true)).toBe(false);
    });
    it("empty is not subset of non-empty", () => {
        const left = new CharSet([3]);
        const right = new CharSet();
        expect(left.subsetOf(right, /*proper*/ false)).toBe(false);
    });
    it("empty is not proper subset of non-empty", () => {
        const left = new CharSet([3]);
        const right = new CharSet();
        expect(left.subsetOf(right, /*proper*/ true)).toBe(false);
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
    expect([...charSet]).toEqual([1, 2, 3]);
});

it("toStartLengthArray", () => {
    const set = new CharSet([[0, 1], [3, 4], [6, 7]]);
    expect(set.toStartLengthArray()).toEqual([0,1, 3,1, 6,1]);
});1