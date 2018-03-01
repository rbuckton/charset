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

// self-balancing AVL-tree for code-point ranges

import * as utils from "./tests/utils";

export class Range {
    public readonly start: number;
    public readonly end: number;

    constructor(start: number, end: number = start) {
        if (end < start) throw new RangeError("'end' may not come before 'start'");
        this.start = start;
        this.end = end;
    }

    public get size() {
        return this.end - this.start;
    }

    public update(start: number, end: number) {
        return start === this.start && end === this.end ? this : new Range(start, end);
    }

    public equals(value: Range) {
        return this === value
            || this.start === value.start && this.end === value.end;
    }

    public contains(value: Range | number) {
        return typeof value === "number"
            ? value >= this.start && value <= this.end
            : value.start >= this.start && value.end <= this.end;
    }

    public clamp(value: number): number;
    public clamp(value: Range): Range;
    public clamp(value: Range | number): Range | number {
        return typeof value === "number"
            ? Math.min(Math.max(this.start, value), this.end)
            : value.update(this.clamp(value.start), this.clamp(value.end));
    }

    public overlaps(value: Range) {
        return this.start <= value.end
            && this.end >= value.start;
    }

    public union(value: Range | null) {
        return value === null
            || value.end < this.start - 1
            || value.start > this.end + 1 ? this :
            this.update(Math.min(this.start, value.start), Math.max(this.end, value.end));
    }

    public intersect(value: Range | null) {
        return value === null
            || value.end < this.start
            || value.start > this.end ? null :
            this.update(Math.max(this.start, value.start), Math.min(this.end, value.end));
    }
}

export class Node {
    public readonly range: Range;
    public readonly left: Node | null;
    public readonly right: Node | null;
    public readonly height: number;
    public readonly leftmost: Node | null;
    public readonly rightmost: Node | null;

    constructor(left: Node | null, range: Range, right: Node | null) {
        if (left !== null && left.max >= range.start - 1) throw new RangeError("Maximum end of left subtree must be less than range start - 1");
        if (right !== null && right.min <= range.end + 1) throw new RangeError("Minimum start of right subtree must be greater than range end + 1");

        this.range = range;
        this.left = left;
        this.right = right;
        this.height = Math.max(height(left), height(right)) + 1;
        this.leftmost = leftmost(left);
        this.rightmost = rightmost(right);
    }

    public get min() {
        return leftmost(this).range.start;
    }

    public get max() {
        return rightmost(this).range.end;
    }
}

function rotateLeft(node: Node) {
    return new Node(new Node(node.left, node.range, node.right!.left), node.right!.range, node.right!.right);
}

function rotateRight(node: Node) {
    return new Node(node.left!.left, node.left!.range, new Node(node.left!.right, node.range, node.right));
}

export function leftmost(T: Node): Node;
export function leftmost(T: Node | null): Node | null;
export function leftmost(T: Node | null) {
    return T && T.leftmost || T;
}

export function rightmost(T: Node): Node;
export function rightmost(T: Node | null): Node | null;
export function rightmost(T: Node | null) {
    return T && T.rightmost || T;
}

export function height(T: Node | null): number {
    return T === null ? 0 : T.height;
}

function expose(T: Node): [Node | null, Range, Node | null] {
    return [T.left, T.range, T.right];
}

export function join(Tl: Node, k: Range | null, Tr: Node | null): Node;
export function join(Tl: Node | null, k: Range, Tr: Node | null): Node;
export function join(Tl: Node | null, k: Range | null, Tr: Node): Node;
export function join(Tl: Node | null, k: Range | null, Tr: Node | null): Node | null;
export function join(Tl: Node | null, k: Range | null, Tr: Node | null): Node | null {
    while (true) {
        if (k === null) {
            // inlined `join2`
            if (Tl === null) return Tr;
            [Tl, k] = splitLast(Tl);
        }

        // If `k` is immediately adjacent to the rightmost of Tl or the leftmost of Tr, we will
        // merge the range rather than allowing adjacent ranges.
        //
        // As a result, instead of:
        //
        //   { [1, 2], [3, 4] }
        //
        // We instead end up with:
        //
        //   { [1, 4] }
        //
        const Tlmax = rightmost(Tl);
        if (Tlmax && Tlmax.range.end === k.start - 1) {
            Tl = replace(Tl, Tlmax.range, new Range(Tlmax.range.start, k.end));
            k = null;
            continue;
        }

        const Trmin = leftmost(Tr);
        if (Trmin && Trmin.range.start === k.end + 1) {
            Tr = replace(Tr, Trmin.range, new Range(k.start, Trmin.range.end));
            k = null;
            continue;
        }

        if (height(Tl) > height(Tr) + 1) return joinRight(Tl!, k, Tr);
        if (height(Tr) > height(Tl) + 1) return joinLeft(Tl, k, Tr!);
        return new Node(Tl, k, Tr);
    }
}

function joinRight(Tl: Node, k: Range, Tr: Node | null): Node {
    const [l, k_, c] = expose(Tl);
    if (height(c) <= height(Tr) + 1) {
        const T_ = new Node(c, k, Tr);
        if (height(T_) <= height(l) + 1) return new Node(l, k_, T_);
        return rotateLeft(new Node(l, k_, rotateRight(T_)));
    }
    else {
        const T_ = joinRight(c!, k, Tr);
        const T__ = new Node(l, k_, T_);
        if (height(T_) <= height(l) + 1) return T__;
        return rotateLeft(T__);
    }
}

function joinLeft(Tl: Node | null, k: Range, Tr: Node): Node {
    const [c, k_, r] = expose(Tr);
    if (height(c) <= height(Tl) + 1) {
        const T_ = new Node(Tl, k, c);
        if (height(T_) <= height(r) + 1) return new Node(T_, k_, r);
        return rotateRight(new Node(rotateLeft(T_), k_, r));
    }
    else {
        const T_ = joinLeft(Tl, k, c!);
        const T__ = new Node(T_, k_, r);
        if (height(T_) <= height(r) + 1) return T__;
        return rotateRight(T__);
    }
}

export function split(T: Node | null, k: Range): [Node | null, Range | null, Node | null] {
    if (T === null) { // range does not exist
        return [null, null, null];
    }

    let [L, m, R] = expose(T);
    if (k.end < m.start) { // k is entirely before m
        const [Ll, b, Lr] = split(L, k);
        return [Ll, b, join(Lr, m, R)];
    }

    if (k.start > m.end) { // k is entirely after m
        const [Rl, b, Rr] = split(R, k);
        return [join(L, m, Rl), b, Rr];
    }

    if (k.start < m.start) { // k overlaps m.start
        L = remove(L, new Range(k.start, m.start - 1));
        k = new Range(m.start, k.end);
    }

    if (k.end > m.end) { // k overlaps m.end
        R = remove(R, new Range(m.end + 1, k.end));
        k = new Range(k.start, m.end);
    }

    if (m.start < k.start) { // k.start bisects m
        L = insert(L, new Range(m.start, k.start - 1));
        m = new Range(k.start, m.end);
    }

    if (m.end > k.end) { // k.end bisects m
        R = insert(R, new Range(k.end + 1, m.end));
        m = new Range(m.start, k.end);
    }

    return [L, m, R];
}

function splitLast(T: Node): [Node | null, Range] {
    const [L, k, R] = expose(T);
    if (R === null) return [L, k];
    const [T_, k_] = splitLast(R);
    return [join(L, k, T_), k_];
}

export function search(T: Node | null, k: number): Node | null {
    return T === null ? null :
        k < T.range.start ? search(T.left, k) :
        k > T.range.end ? search(T.right, k) :
        T;
}

export function insert(T: Node | null, k: Range) {
    const [Tl, , Tr] = split(T, k);
    return join(Tl, k, Tr);
}

export function remove(T: Node | null, k: Range) {
    const [Tl, , Tr] = split(T, k);
    return join(Tl, null, Tr);
}

function replace(T: Node | null, k1: Range, k2: Range) {
    const [Tl, , Tr] = split(T, k1);
    return join(Tl, k2, Tr);
}

export function union(T1: Node | null, T2: Node | null): Node | null {
    if (T1 === null) return T2;
    if (T2 === null) return T1;
    const [L2, k2, R2] = expose(T2);
    const [L1, k1, R1] = split(T1, k2);
    // If JS supported parallelism, the next two statements could
    // be safely run in parallel.
    const Tl = union(L1, L2);
    const Tr = union(R1, R2);
    return join(Tl, k2.union(k1), Tr);
}

function slice(T: Node | null, k: Range) {
    const [,,Tr] = split(T, new Range(k.start - 1));
    const [Trl] = split(Tr, new Range(k.end + 1));
    return Trl;
}

export function intersect(T1: Node | null, T2: Node | null): Node | null {
    if (T1 === null) return null;
    if (T2 === null) return null;
    const [L2, k2, R2] = expose(T2);
    const [L1, k1, R1] = split(T1, k2);
    // If JS supported parallelism, the next two statements could
    // be safely run in parallel.
    const Tl = intersect(L1, L2);
    const Tr = intersect(R1, R2);
    const Tm = slice(T1, k2);
    return join(join(Tl, null, Tm), null, Tr);
}

export function difference(T1: Node | null, T2: Node | null): Node | null {
    if (T1 === null) return null;
    if (T2 === null) return T1;
    const [L2, k2, R2] = expose(T2);
    const [L1, , R1] = split(T1, k2);
    // If JS supported parallelism, the next two statements could
    // be safely run in parallel.
    const Tl = difference(L1, L2);
    const Tr = difference(R1, R2);
    return join(Tl, null, Tr);
}

export function invert(T: Node | null, k: Range) {
    return difference(new Node(null, k, null), T);
}

export function deserialize(array: ReadonlyArray<number>, bounds: Range = new Range(-Infinity, +Infinity)): Node | null {
    if (array.length % 2 !== 0) throw new TypeError();
    return deserializeRecursive(array, 0, (array.length >> 1) - 1, bounds);
}

function deserializeRecursive(array: ReadonlyArray<number>, start: number, end: number, bounds: Range): Node | null {
    if (end < start || start > end) return null;
    const mid = start + (end - start >> 1);
    const index = mid << 1;
    const range = new Range(array[index], array[index] + array[index + 1]);
    if (!bounds.contains(range)) throw new RangeError();
    const left = deserializeRecursive(array, start, mid - 1, bounds);
    const right = deserializeRecursive(array, mid + 1, end, bounds);
    return new Node(left, range, right);
}

export function serialize(T: Node | null): number[] {
    const array: number[] = [];
    const stack: Node[] = [];
    while (T !== null) {
        stack.push(T);
        T = T.left;
    }

    while (T = stack.pop() || null) {
        array.push(T.range.start, T.range.size);
        if (T.right !== null) {
            T = T.right;
            while (T !== null) {
                stack.push(T);
                T = T.left;
            }
        }
    }

    return array;
}

export function size(T: Node | null): number {
    return T === null ? 0 : 1 + size(T.left) + size(T.right);
}

export function rangeSize(T: Node | null): number {
    return T == null ? 0 : 1 + T.range.size + rangeSize(T.left) + rangeSize(T.right);
}

export function equals(Tl: Node | null, Tr: Node | null) {
    if (Tl === Tr) return true;
    if (Tl === null) return Tr === null;
    if (Tr === null) return false;

    const leftStack: Node[] = [];
    const rightStack: Node[] = [];
    while (Tl !== null) {
        leftStack.push(Tl);
        Tl = Tl.left;
    }

    while (Tr !== null) {
        rightStack.push(Tr);
        Tr = Tr.left;
    }

    Tl = leftStack.pop()!;
    Tr = rightStack.pop()!;
    while (Tl && Tr) {
        if (!Tl.range.equals(Tr.range)) return false;
        if (Tl.right !== null) {
            Tl = Tl.right;
            while (Tl !== null) {
                leftStack.push(Tl);
                Tl = Tl.left;
            }
        }
        if (Tr.right !== null) {
            Tr = Tr.right;
            while (Tr !== null) {
                rightStack.push(Tr);
                Tr = Tr.left;
            }
        }
        Tl = leftStack.pop() || null;
        Tr = rightStack.pop() || null;
    }

    return Tl === null && Tr === null;
}

export function supersetOf(superset: Node | null, subset: Node | null, proper: boolean) {
    if (superset === null) return !proper && subset === null;
    if (subset === null) return true;

    const supersetIterator = iterate(superset);
    const subsetIterator = iterate(subset);

    let possiblyProper = false;
    let supersetRange = nextResult(supersetIterator);
    let subsetRange = nextResult(subsetIterator);
    while (supersetRange && subsetRange) {
        if (supersetRange.equals(subsetRange)) {
            supersetRange = nextResult(supersetIterator);
            subsetRange = nextResult(subsetIterator);
        }
        else {
            if (supersetRange.end < subsetRange.start) {
                supersetRange = nextResult(supersetIterator);
            }
            else if (supersetRange.contains(subsetRange)) {
                subsetRange = nextResult(subsetIterator);
            }
            else {
                return false;
            }
            possiblyProper = true;
        }
    }
    if (supersetRange) possiblyProper = true;
    if (subsetRange) return false;
    if (proper && !possiblyProper) return false;
    return true;
}

function nextResult<T>(iterator: Iterator<T>) {
    const result = iterator.next();
    return result.done ? null : result.value;
}

export function* iterate(T: Node | null) {
    const stack: Node[] = [];
    while (T !== null) {
        stack.push(T);
        T = T.left;
    }
    while (T = stack.pop() || null) {
        yield T.range;
        if (T.right !== null) {
            T = T.right;
            while (T !== null) {
                stack.push(T);
                T = T.left;
            }
        }
    }
}