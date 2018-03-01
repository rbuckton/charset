import "./utils"; // ensure side effects installed
import { Range, Node, insert, remove, union, intersect, difference, invert, deserialize, iterate, equals, search, serialize, size, rangeSize, supersetOf, join } from "../rangeTree"
import { print, format } from "./utils";

describe("Range", () => {
    it("invariants", () => {
        expect(() => { new Range(1, 0) }).toThrow(RangeError);
    });
    it("start", () => {
        expect(new Range(0).start).toBe(0);
        expect(new Range(0, 1).start).toBe(0);
    });
    it("end", () => {
        expect(new Range(1).end).toBe(1);
        expect(new Range(0, 1).end).toBe(1);
    });
    it("size", () => {
        expect(new Range(0).size).toBe(0);
        expect(new Range(0, 1).size).toBe(1);
    });
    it("update", () => {
        const a = new Range(0);
        expect(a.update(0, 0)).toBe(a);
        expect(a.update(1, 2)).not.toBe(a);
        expect(a.update(1, 2).start).toBe(1);
        expect(a.update(1, 2).end).toBe(2);
    });
    it("equals", () => {
        const a = new Range(1, 5);
        const b = new Range(1, 5);
        const c = new Range(2, 5);
        const d = new Range(4, 7);
        const e = new Range(6, 10);
        expect(a.equals(a)).toBe(true);
        expect(a.equals(b)).toBe(true);
        expect(a.equals(c)).toBe(false);
        expect(a.equals(d)).toBe(false);
        expect(a.equals(e)).toBe(false);
    });
    it("contains", () => {
        const a = new Range(1, 5);
        const b = new Range(1, 5);
        const c = new Range(2, 5);
        const d = new Range(4, 7);
        const e = new Range(6, 10);
        expect(a.contains(a)).toBe(true);
        expect(a.contains(b)).toBe(true);
        expect(a.contains(c)).toBe(true);
        expect(a.contains(d)).toBe(false);
        expect(a.contains(e)).toBe(false);
    });
    it("overlaps", () => {
        const a = new Range(1, 5);
        const b = new Range(1, 5);
        const c = new Range(2, 5);
        const d = new Range(4, 7);
        const e = new Range(6, 10);
        expect(a.overlaps(a)).toBe(true);
        expect(a.overlaps(b)).toBe(true);
        expect(a.overlaps(c)).toBe(true);
        expect(a.overlaps(d)).toBe(true);
        expect(a.overlaps(e)).toBe(false);
    });
    it("union", () => {
        const a = new Range(1, 5);
        const b = new Range(1, 5);
        const c = new Range(2, 5);
        const d = new Range(4, 7);
        const e = new Range(6, 10);
        const f = new Range(0);
        const g = new Range(7, 10);
        expect(a.union(null)).toBe(a);
        expect(a.union(a)).toBe(a);
        expect(a.union(b)).toBe(a);
        expect(a.union(c)).toBe(a);
        expect(a.union(d)).toEqual(new Range(1, 7));
        expect(a.union(e)).toEqual(new Range(1, 10));
        expect(a.union(f)).toEqual(new Range(0, 5));
        expect(a.union(g)).toBe(a);
    });
    it("intersect", () => {
        const a = new Range(1, 5);
        const b = new Range(1, 5);
        const c = new Range(2, 5);
        const d = new Range(4, 7);
        const e = new Range(6, 10);
        const f = new Range(0);
        const g = new Range(7, 10);
        expect(a.intersect(null)).toBeNull();
        expect(a.intersect(a)).toBe(a);
        expect(a.intersect(b)).toBe(a);
        expect(a.intersect(c)).toEqual(new Range(2, 5));
        expect(a.intersect(d)).toEqual(new Range(4, 5));
        expect(a.intersect(e)).toBeNull();
        expect(a.intersect(f)).toBeNull();
        expect(a.intersect(g)).toBeNull();
    });
});
describe("Node", () => {
    it("invariants", () => {
        expect(() => { new Node(new Node(null, new Range(5), null), new Range(5), null) }).toThrow(RangeError);
        expect(() => { new Node(null, new Range(5), new Node(null, new Range(5), null)) }).toThrow(RangeError);
    });
    it("range", () => {
        const range = new Range(0);
        expect(new Node(null, range, null).range).toBe(range);
    });
    it("left", () => {
        const left = new Node(null, new Range(0), null);
        expect(new Node(null, new Range(2), null).left).toBe(null);
        expect(new Node(left, new Range(2), null).left).toBe(left);
    });
    it("right", () => {
        const right = new Node(null, new Range(4), null);
        expect(new Node(null, new Range(2), null).right).toBe(null);
        expect(new Node(null, new Range(2), right).right).toBe(right);
    });
    it("height", () => {
        let root: Node | null = null;
        const T = new Node(
            new Node(
                new Node(null, new Range(3), null),
                new Range(5),
                new Node(null, new Range(7), null)
            ),
            new Range(9),
            new Node(
                new Node(null, new Range(11), null),
                new Range(13),
                new Node(null, new Range(15),
                    new Node(null, new Range(17), null)
                )
            )
        );
        expect(T.height).toBe(4);
        expect(T.left!.height).toBe(2);
        expect(T.left!.left!.height).toBe(1);
        expect(T.right!.height).toBe(3);
    });
    it("leftmost", () => {
        let root: Node | null = null;
        const T = new Node(
            new Node(
                new Node(null, new Range(3), null),
                new Range(5),
                new Node(null, new Range(7), null)
            ),
            new Range(9),
            new Node(
                new Node(null, new Range(11), null),
                new Range(13),
                new Node(null, new Range(15), null)
            )
        );
        expect(T.leftmost).toBe(T.left!.left);
        expect(T.left!.leftmost).toBe(T.left!.left);
        expect(T.left!.left!.leftmost).toBeNull();
        expect(T.left!.right!.leftmost).toBeNull();
        expect(T.right!.leftmost).toBe(T.right!.left);
        expect(T.right!.left!.leftmost).toBeNull();
        expect(T.right!.right!.leftmost).toBeNull();
    });
    it("rightmost", () => {
        let root: Node | null = null;
        const T = new Node(
            new Node(
                new Node(null, new Range(3), null),
                new Range(5),
                new Node(null, new Range(7), null)
            ),
            new Range(9),
            new Node(
                new Node(null, new Range(11), null),
                new Range(13),
                new Node(null, new Range(15), null)
            )
        );
        expect(T.rightmost).toBe(T.right!.right);
        expect(T.left!.rightmost).toBe(T.left!.right);
        expect(T.left!.left!.rightmost).toBeNull();
        expect(T.left!.right!.rightmost).toBeNull();
        expect(T.right!.rightmost).toBe(T.right!.right);
        expect(T.right!.left!.rightmost).toBeNull();
        expect(T.right!.right!.rightmost).toBeNull();
    });
    it("min", () => {
        let root: Node | null = null;
        const T = new Node(
            new Node(
                new Node(null, new Range(3), null),
                new Range(5),
                new Node(null, new Range(7), null)
            ),
            new Range(9),
            new Node(
                new Node(null, new Range(11), null),
                new Range(13),
                new Node(null, new Range(15), null)
            )
        );
        expect(T.min).toBe(3);
        expect(T.left!.min).toBe(3);
        expect(T.left!.left!.min).toBe(3);
        expect(T.left!.right!.min).toBe(7);
        expect(T.right!.min).toBe(11);
        expect(T.right!.left!.min).toBe(11);
        expect(T.right!.right!.min).toBe(15);
    });
    it("max", () => {
        let root: Node | null = null;
        const T = new Node(
            new Node(
                new Node(null, new Range(3), null),
                new Range(5),
                new Node(null, new Range(7), null)
            ),
            new Range(9),
            new Node(
                new Node(null, new Range(11), null),
                new Range(13),
                new Node(null, new Range(15), null)
            )
        );
        expect(T.max).toBe(15);
        expect(T.left!.max).toBe(7);
        expect(T.left!.left!.max).toBe(3);
        expect(T.left!.right!.max).toBe(7);
        expect(T.right!.max).toBe(15);
        expect(T.right!.left!.max).toBe(11);
        expect(T.right!.right!.max).toBe(15);
    });
});
describe("join", () => {
    it("heavier left", () => {
        const left = new Node(
            new Node(
                new Node(null, new Range(5), null),
                new Range(7),
                new Node(null, new Range(9), null)
            ),
            new Range(11),
            new Node(null, new Range(13), null)
        );
        const k = new Range(15);
        const result = join(left, k, null);
        expect(result).toBeTreeOf("N(11){L(7){L(5)R(9)}R(15){L(13)}}");
    });
    it("light right", () => {
        const k = new Range(3);
        const right = new Node(
            new Node(null, new Range(7), null),
            new Range(11),
            null
        );
        const result = join(null, k, right);
        expect(result).toBeTreeOf("N(7){L(3)R(11)}");
    });
    it("heavier right", () => {
        const right = new Node(
            new Node(
                new Node(null, new Range(5), null),
                new Range(7),
                new Node(null, new Range(9), null)
            ),
            new Range(11),
            new Node(null, new Range(13), null)
        );
        const k = new Range(3);
        const result = join(null, k, right);
        expect(result).toBeTreeOf("N(7){L(3){R(5)}R(11){L(9)R(13)}}");
    });
    it("heavier right 2", () => {
        const right = new Node(
            new Node(
                new Node(null, new Range(5), null),
                new Range(7),
                new Node(null, new Range(9), null)
            ),
            new Range(11),
            new Node(
                null,
                new Range(13),
                new Node(null, new Range(15), null)
            )
        );
        const k = new Range(3);
        const result = join(null, k, right);
        expect(result).toBeTreeOf("N(11){L(7){L(3){R(5)}R(9)}R(13){R(15)}}");
    });
});
describe("insert", () => {
    it("root", () => {
        let root: Node | null = null;
        root = insert(root, new Range(5));
        expect(root).toBeTreeOf("N(5)");
        expect(root).toBeBalanced();
    });
    it("left", () => {
        let root: Node | null = null;
        root = insert(root, new Range(7));
        root = insert(root, new Range(5));
        expect(root).toBeTreeOf("N(5){R(7)}");
        expect(root).toBeBalanced();
    });
    it("left heavy", () => {
        let root: Node | null = null;
        root = insert(root, new Range(7));
        root = insert(root, new Range(5));
        root = insert(root, new Range(3));
        expect(root).toBeTreeOf("N(5){L(3)R(7)}");
        expect(root).toBeBalanced();
    });
    it("right", () => {
        let root: Node | null = null;
        root = insert(root, new Range(7));
        root = insert(root, new Range(9));
        expect(root).toBeTreeOf("N(9){L(7)}");
        expect(root).toBeBalanced();
    });
    it("right heavy", () => {
        let root: Node | null = null;
        root = insert(root, new Range(7));
        root = insert(root, new Range(9));
        root = insert(root, new Range(11));
        expect(root).toBeTreeOf("N(9){L(7)R(11)}");
        expect(root).toBeBalanced();
    });
    it("balanced", () => {
        let root: Node | null = null;
        root = insert(root, new Range(9));
        root = insert(root, new Range(7));
        root = insert(root, new Range(11));
        expect(root).toBeTreeOf("N(9){L(7)R(11)}");
        expect(root).toBeBalanced();
    });
    it("balanced heavy", () => {
        let root: Node | null = null;
        root = insert(root, new Range(3));
        root = insert(root, new Range(5));
        root = insert(root, new Range(7));
        root = insert(root, new Range(9));
        root = insert(root, new Range(11));
        root = insert(root, new Range(13));
        root = insert(root, new Range(15));
        expect(root).toBeTreeOf("N(9){L(5){L(3)R(7)}R(13){L(11)R(15)}}");
        expect(root).toBeBalanced();
    });
    it("overlap left", () => {
        let root: Node | null = null;
        root = insert(root, new Range(9));
        root = insert(root, new Range(7));
        root = insert(root, new Range(11));
        root = insert(root, new Range(7, 9));
        expect(root).toBeTreeOf("N(7,9){R(11)}");
        expect(root).toBeBalanced();
    });
    it("overlap right", () => {
        let root: Node | null = null;
        root = insert(root, new Range(9));
        root = insert(root, new Range(7));
        root = insert(root, new Range(11));
        root = insert(root, new Range(9, 11));
        expect(root).toBeTreeOf("N(9,11){L(7)}");
        expect(root).toBeBalanced();
    });
    it("overlap mix", () => {
        let root: Node | null = null;
        root = insert(root, new Range(3));
        root = insert(root, new Range(5));
        root = insert(root, new Range(7));
        root = insert(root, new Range(9));
        root = insert(root, new Range(11));
        root = insert(root, new Range(13));
        root = insert(root, new Range(7, 11));
        expect(root).toBeTreeOf("N(7,11){L(5){L(3)}R(13)}");
        expect(root).toBeBalanced();
    });
    it("adjacent on left", () => {
        let root: Node | null = null;
        root = insert(root, new Range(3));
        root = insert(root, new Range(4));
        expect(root).toBeTreeOf("N(3,4)");
        expect(root).toBeBalanced();
    });
    it("adjacent on right", () => {
        let root: Node | null = null;
        root = insert(root, new Range(4));
        root = insert(root, new Range(3));
        expect(root).toBeTreeOf("N(3,4)");
        expect(root).toBeBalanced();
    });
});
describe("remove", () => {
    it("left leaf", () => {
        let root: Node | null = null;
        root = insert(root, new Range(3));
        root = insert(root, new Range(5));
        root = insert(root, new Range(7));
        root = insert(root, new Range(9));
        root = insert(root, new Range(11));
        root = insert(root, new Range(13));
        root = insert(root, new Range(15));
        root = remove(root, new Range(3));
        expect(root).toBeTreeOf("N(9){L(5){R(7)}R(13){L(11)R(15)}}");
        expect(root).toBeBalanced();
    });
    it("left branch", () => {
        let root: Node | null = null;
        root = insert(root, new Range(3));
        root = insert(root, new Range(5));
        root = insert(root, new Range(7));
        root = insert(root, new Range(9));
        root = insert(root, new Range(11));
        root = insert(root, new Range(13));
        root = insert(root, new Range(15));
        root = remove(root, new Range(5));
        expect(root).toBeTreeOf("N(9){L(3){R(7)}R(13){L(11)R(15)}}");
        expect(root).toBeBalanced();
    });
    it("right leaf", () => {
        let root: Node | null = null;
        root = insert(root, new Range(3));
        root = insert(root, new Range(5));
        root = insert(root, new Range(7));
        root = insert(root, new Range(9));
        root = insert(root, new Range(11));
        root = insert(root, new Range(13));
        root = insert(root, new Range(15));
        root = remove(root, new Range(11));
        expect(root).toBeTreeOf("N(9){L(5){L(3)R(7)}R(13){R(15)}}");
        expect(root).toBeBalanced();
    });
    it("right branch", () => {
        let root: Node | null = null;
        root = insert(root, new Range(3));
        root = insert(root, new Range(5));
        root = insert(root, new Range(7));
        root = insert(root, new Range(9));
        root = insert(root, new Range(11));
        root = insert(root, new Range(13));
        root = insert(root, new Range(15));
        root = remove(root, new Range(13));
        expect(root).toBeTreeOf("N(9){L(5){L(3)R(7)}R(11){R(15)}}");
        expect(root).toBeBalanced();
    });
    it("leading", () => {
        let root: Node | null = null;
        root = insert(root, new Range(1, 5));
        root = remove(root, new Range(1, 3));
        expect(root).toBeTreeOf("N(4,5)");
        expect(root).toBeBalanced();
    });
    it("trailing", () => {
        let root: Node | null = null;
        root = insert(root, new Range(1, 5));
        root = remove(root, new Range(3, 5));
        expect(root).toBeTreeOf("N(1,2)");
        expect(root).toBeBalanced();
    });
    it("split", () => {
        let root: Node | null = null;
        root = insert(root, new Range(1, 7));
        root = remove(root, new Range(3, 5));
        expect(root).toBeTreeOf("N(1,2){R(6,7)}");
        expect(root).toBeBalanced();
    });
    it("overlap leading", () => {
        let root: Node | null = null;
        root = insert(root, new Range(1));
        root = insert(root, new Range(3, 5));
        root = remove(root, new Range(1, 3));
        expect(root).toBeTreeOf("N(4,5)");
        expect(root).toBeBalanced();
    });
    it("overlap leading and in between", () => {
        let root: Node | null = null;
        root = insert(root, new Range(1));
        root = insert(root, new Range(3));
        root = insert(root, new Range(5, 7));
        root = remove(root, new Range(1, 5));
        expect(root).toBeTreeOf("N(6,7)");
        expect(root).toBeBalanced();
    });
    it("overlap trailing", () => {
        let root: Node | null = null;
        root = insert(root, new Range(5));
        root = insert(root, new Range(1, 3));
        root = remove(root, new Range(3, 5));
        expect(root).toBeTreeOf("N(1,2)");
        expect(root).toBeBalanced();
    });
    it("overlap trailing and in between", () => {
        let root: Node | null = null;
        root = insert(root, new Range(1, 3));
        root = insert(root, new Range(5));
        root = insert(root, new Range(7));
        root = remove(root, new Range(3, 7));
        expect(root).toBeTreeOf("N(1,2)");
        expect(root).toBeBalanced();
    });
});
describe("search", () => {
    it("exist (one node)", () => {
        let root: Node | null = null;
        root = insert(root, new Range(5, 10));
        expect(search(root, 7)).toBe(root);
    });
    it("exist (on left)", () => {
        let root: Node | null = null;
        root = insert(root, new Range(7));
        root = insert(root, new Range(2, 4));
        expect(search(root, 3)).toBe(root)
    });
    it("exist (on right)", () => {
        let root: Node | null = null;
        root = insert(root, new Range(3));
        root = insert(root, new Range(6, 8));
        expect(search(root, 7)).toBe(root)
    });
    it("not exist (null)", () => {
        expect(search(null, 0)).toBeNull();
    });
    it("not exist (one node)", () => {
        let root: Node | null = null;
        root = insert(root, new Range(5, 10));
        expect(search(root, 0)).toBeNull();
        expect(search(root, 15)).toBeNull();
    });
});
describe("union", () => {
    it("left empty", () => {
        let left: Node | null = null;
        let right: Node | null = null;
        right = insert(right, new Range(5));
        const root = union(left, right);
        expect(root).toBeTreeOf("N(5)");
        expect(root).toBeBalanced();
    });
    it("right empty", () => {
        let left: Node | null = null;
        left = insert(left, new Range(5));
        let right: Node | null = null;
        const root = union(left, right);
        expect(root).toBeTreeOf("N(5)");
        expect(root).toBeBalanced();
    });
    it("no overlap", () => {
        let left: Node | null = null;
        left = insert(left, new Range(5));
        let right: Node | null = null;
        right = insert(right, new Range(7));
        const root = union(left, right);
        expect(root).toBeTreeOf("N(7){L(5)}");
        expect(root).toBeBalanced();
    });
    it("shared nodes", () => {
        let left: Node | null = null;
        left = insert(left, new Range(5));
        left = insert(left, new Range(3));
        let right: Node | null = null;
        right = insert(right, new Range(5));
        right = insert(right, new Range(7));
        const root = union(left, right);
        expect(root).toBeTreeOf("N(5){L(3)R(7)}");
        expect(root).toBeBalanced();
    });
    it("overlapping ranges", () => {
        let left: Node | null = null;
        left = insert(left, new Range(3, 5));
        let right: Node | null = null;
        right = insert(right, new Range(5, 7));
        const root = union(left, right);
        expect(root).toBeTreeOf("N(3,7)");
        expect(root).toBeBalanced();
    });
});
describe("intersect", () => {
    it("left empty", () => {
        let left: Node | null = null;
        let right: Node | null = null;
        right = insert(right, new Range(5));
        const root = intersect(left, right);
        expect(root).toBeTreeOf("");
        expect(root).toBeBalanced();
    });
    it("right empty", () => {
        let left: Node | null = null;
        left = insert(left, new Range(5));
        let right: Node | null = null;
        const root = intersect(left, right);
        expect(root).toBeTreeOf("");
        expect(root).toBeBalanced();
    });
    it("no overlap", () => {
        let left: Node | null = null;
        left = insert(left, new Range(5));
        let right: Node | null = null;
        right = insert(right, new Range(7));
        const root = intersect(left, right);
        expect(root).toBeTreeOf("");
        expect(root).toBeBalanced();
    });
    it("shared nodes", () => {
        let left: Node | null = null;
        left = insert(left, new Range(5));
        left = insert(left, new Range(3));
        let right: Node | null = null;
        right = insert(right, new Range(5));
        right = insert(right, new Range(7));
        const root = intersect(left, right);
        expect(root).toBeTreeOf("N(5)");
        expect(root).toBeBalanced();
    });
    it("overlapping ranges", () => {
        let left: Node | null = null;
        left = insert(left, new Range(3, 5));
        let right: Node | null = null;
        right = insert(right, new Range(5, 7));
        const root = intersect(left, right);
        expect(root).toBeTreeOf("N(5)");
        expect(root).toBeBalanced();
    });
    it("overlapping ranges 2", () => {
        let left: Node | null = null;
        left = insert(left, new Range(0, 3));
        left = insert(left, new Range(5, 7));
        let right: Node | null = null;
        right = insert(right, new Range(2, 6));
        const root = intersect(left, right);
        expect(root).toBeTreeOf("N(5,6){L(2,3)}");
        expect(root).toBeBalanced();
    });
});
describe("difference", () => {
    it("left empty", () => {
        let left: Node | null = null;
        let right: Node | null = null;
        right = insert(right, new Range(5));
        const root = difference(left, right);
        expect(root).toBeTreeOf("");
        expect(root).toBeBalanced();
    });
    it("right empty", () => {
        let left: Node | null = null;
        left = insert(left, new Range(5));
        let right: Node | null = null;
        const root = difference(left, right);
        expect(root).toBeTreeOf("N(5)");
        expect(root).toBeBalanced();
    });
    it("no overlap", () => {
        let left: Node | null = null;
        left = insert(left, new Range(5));
        let right: Node | null = null;
        right = insert(right, new Range(7));
        const root = difference(left, right);
        expect(root).toBeTreeOf("N(5)");
        expect(root).toBeBalanced();
    });
    it("shared nodes", () => {
        let left: Node | null = null;
        left = insert(left, new Range(5));
        left = insert(left, new Range(3));
        let right: Node | null = null;
        right = insert(right, new Range(5));
        right = insert(right, new Range(7));
        const root = difference(left, right);
        expect(root).toBeTreeOf("N(3)");
        expect(root).toBeBalanced();
    });
    it("overlapping ranges", () => {
        let left: Node | null = null;
        left = insert(left, new Range(3, 5));
        let right: Node | null = null;
        right = insert(right, new Range(5, 7));
        const root = difference(left, right);
        expect(root).toBeTreeOf("N(3,4)");
        expect(root).toBeBalanced();
    });
});
describe("invert", () => {
    it("empty", () => {
        let root: Node | null = null;
        root = invert(root, new Range(0, 10));
        expect(root).toBeTreeOf("N(0,10)");
        expect(root).toBeBalanced();
    });
    it("all", () => {
        let root: Node | null = null;
        root = insert(root, new Range(0, 10));
        root = invert(root, new Range(0, 10));
        expect(root).toBeTreeOf("");
        expect(root).toBeBalanced();
    });
    it("mixed", () => {
        let root: Node | null = null;
        root = insert(root, new Range(0, 5));
        root = invert(root, new Range(0, 10));
        expect(root).toBeTreeOf("N(6,10)");
        expect(root).toBeBalanced();
    });
    it("deep", () => {
        let root: Node | null = null;
        root = insert(root, new Range(3));
        root = insert(root, new Range(5));
        root = insert(root, new Range(7));
        root = insert(root, new Range(9));
        root = insert(root, new Range(11));
        root = insert(root, new Range(13));
        root = insert(root, new Range(15));
        root = invert(root, new Range(3, 15));
        expect(root).toBeTreeOf("N(8){L(6){L(4)}R(12){L(10)R(14)}}");
        expect(root).toBeBalanced();
    });
});
describe("deserialize", () => {
    it("invariants", () => {
        expect(() => { deserialize([0]); }).toThrow(TypeError);
        expect(() => { deserialize([0, 0], new Range(1)); }).toThrow(RangeError);
    });
    it("multiple ranges", () => {
        let root = deserialize([3, 0, 5, 0, 7, 0, 9, 0, 11, 0, 13, 0, 15, 0]);
        expect(root).toBeTreeOf("N(9){L(5){L(3)R(7)}R(13){L(11)R(15)}}");
        expect(root).toBeBalanced();
    });
});
describe("serialize", () => {
    it("null", () => {
        expect(serialize(null)).toEqual([]);
    });
    it("balanced heavy", () => {
        let root: Node | null = null;
        root = insert(root, new Range(1, 3));
        root = insert(root, new Range(5));
        root = insert(root, new Range(7));
        root = insert(root, new Range(9));
        root = insert(root, new Range(11));
        root = insert(root, new Range(13));
        root = insert(root, new Range(15, 17));
        expect(serialize(root)).toEqual([1, 2, 5, 0, 7, 0, 9, 0, 11, 0, 13, 0, 15, 2]);
    });
});
describe("size", () => {
    it("null", () => {
        expect(size(null)).toBe(0);
    });
    it("tree", () => {
        let root: Node | null = null;
        root = insert(root, new Range(1, 3));
        root = insert(root, new Range(5));
        root = insert(root, new Range(7));
        expect(size(root)).toBe(3);
    });
});
describe("rangeSize", () => {
    it("null", () => {
        expect(rangeSize(null)).toBe(0);
    });
    it("tree", () => {
        let root: Node | null = null;
        root = insert(root, new Range(1, 3));
        root = insert(root, new Range(5));
        root = insert(root, new Range(7));
        expect(rangeSize(root)).toBe(5);
    });
});
describe("iterate", () => {
    it("empty", () => {
        const result = iterate(null);
        expect(format(result)).toBe("");
    });
    it("single", () => {
        let root: Node | null = null;
        root = insert(root, new Range(5));
        const result = iterate(root);
        expect(format(result)).toBe("(5)");
    });
    it("balanced heavy", () => {
        let root: Node | null = null;
        root = insert(root, new Range(3));
        root = insert(root, new Range(5));
        root = insert(root, new Range(7));
        root = insert(root, new Range(9));
        root = insert(root, new Range(11));
        root = insert(root, new Range(13));
        root = insert(root, new Range(15));
        const result = iterate(root);
        expect(format(result)).toBe("(3)(5)(7)(9)(11)(13)(15)");
    });

    function format(iterator: IterableIterator<Range>) {
        let text = "";
        for (const range of iterator) {
            text += range.size === 0
                ? `(${range.start})`
                : `(${range.start},${range.end})`;
        }
        return text;
    }
});
describe("equals", () => {
    it("comparing nulls", () => {
        expect(equals(null, null)).toBe(true);
    });
    it("left null", () => {
        let right: Node | null = null;
        right = insert(right, new Range(3));
        expect(equals(null, right)).toBe(false);
    });
    it("right null", () => {
        let left: Node | null = null;
        left = insert(left, new Range(3));
        expect(equals(left, null)).toBe(false);
    });
    it("same reference", () => {
        let node: Node | null = null;
        node = insert(node, new Range(3));
        expect(equals(node, node)).toBe(true);
    });
    it("same values, different structures", () => {
        const left = new Node(null, new Range(3), new Node(null, new Range(5), null));
        const right = new Node(new Node(null, new Range(3), null), new Range(5), null);
        expect(equals(left, right)).toBe(true);
    });
    it("not equal", () => {
        let left: Node | null = null;
        left = insert(left, new Range(3));
        let right: Node | null = null;
        right = insert(right, new Range(5));
        expect(equals(left, right)).toBe(false);
    });
    it("deep", () => {
        let left: Node | null = null;
        left = insert(left, new Range(3));
        left = insert(left, new Range(5));
        left = insert(left, new Range(7));
        let right: Node | null = null;
        right = insert(right, new Range(3));
        right = insert(right, new Range(5));
        right = insert(right, new Range(7));
        expect(equals(left, right)).toBe(true);
    });
});
describe("supersetOf", () => {
    it("is superset (same structure and values)", () => {
        let left: Node | null = null;
        left = insert(left, new Range(3));
        left = insert(left, new Range(5));
        left = insert(left, new Range(7));
        let right: Node | null = null;
        right = insert(right, new Range(3));
        right = insert(right, new Range(5));
        right = insert(right, new Range(7));
        expect(supersetOf(left, right, /*proper*/ false)).toBe(true);
    });
    it("is superset (with ranges)", () => {
        let left: Node | null = null;
        left = insert(left, new Range(3, 5));
        left = insert(left, new Range(7));
        let right: Node | null = null;
        right = insert(right, new Range(3));
        right = insert(right, new Range(5));
        right = insert(right, new Range(7));
        expect(supersetOf(left, right, /*proper*/ false)).toBe(true);
    });
    it("is superset (different structure, same values)", () => {
        let left: Node | null = null;
        left = insert(left, new Range(3));
        left = insert(left, new Range(7));
        let right: Node | null = null;
        right = insert(right, new Range(7));
        right = insert(right, new Range(3));
        expect(supersetOf(left, right, /*proper*/ false)).toBe(true);
    });
    it("is superset (smaller right)", () => {
        let left: Node | null = null;
        left = insert(left, new Range(3));
        left = insert(left, new Range(5));
        left = insert(left, new Range(7));
        let right: Node | null = null;
        right = insert(right, new Range(3));
        right = insert(right, new Range(5));
        expect(supersetOf(left, right, /*proper*/ false)).toBe(true);
    });
    it("is proper superset (same structure and values)", () => {
        let left: Node | null = null;
        left = insert(left, new Range(3));
        left = insert(left, new Range(5));
        left = insert(left, new Range(7));
        let right: Node | null = null;
        right = insert(right, new Range(3));
        right = insert(right, new Range(5));
        right = insert(right, new Range(7));
        expect(supersetOf(left, right, /*proper*/ true)).toBe(false);
    });
    it("is proper superset (different structure, same values)", () => {
        let left: Node | null = null;
        left = insert(left, new Range(3));
        left = insert(left, new Range(7));
        let right: Node | null = null;
        right = insert(right, new Range(7));
        right = insert(right, new Range(3));
        expect(supersetOf(left, right, /*proper*/ true)).toBe(false);
    });
    it("is proper superset (smaller right)", () => {
        let left: Node | null = null;
        left = insert(left, new Range(3));
        left = insert(left, new Range(5));
        left = insert(left, new Range(7));
        let right: Node | null = null;
        right = insert(right, new Range(3));
        right = insert(right, new Range(5));
        expect(supersetOf(left, right, /*proper*/ true)).toBe(true);
    });
    it("is not superset", () => {
        let left: Node | null = null;
        left = insert(left, new Range(3));
        left = insert(left, new Range(5));
        let right: Node | null = null;
        right = insert(right, new Range(3));
        right = insert(right, new Range(7));
        expect(supersetOf(left, right, /*proper*/ false)).toBe(false);
    });
    it("is not superset (with ranges)", () => {
        let left: Node | null = null;
        left = insert(left, new Range(3));
        left = insert(left, new Range(5));
        let right: Node | null = null;
        right = insert(right, new Range(3, 7));
        expect(supersetOf(left, right, /*proper*/ false)).toBe(false);
    });
    it("null is superset of null", () => {
        expect(supersetOf(null, null, /*proper*/ false)).toBe(true);
    });
    it("null is not proper superset of null", () => {
        expect(supersetOf(null, null, /*proper*/ true)).toBe(false);
    });
    it("null is not superset of node", () => {
        let right: Node | null = null;
        right = insert(right, new Range(3));
        expect(supersetOf(null, right, /*proper*/ true)).toBe(false);
    });
    it("node is superset of null", () => {
        let left: Node | null = null;
        left = insert(left, new Range(3));
        expect(supersetOf(left, null, /*proper*/ false)).toBe(true);
    });
});
