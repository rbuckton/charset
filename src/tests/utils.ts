import { Range, Node, insert, remove } from "../rangeTree"
import diff = require("jest-diff");

export function print(node: Node | null) {
    console.log(format(node, "N", /*pretty*/ true));
}

function parse(text: string): Node | null {
    const scanner = /[NLR(),{}\n]|^ +|0[xX][\da-fA-F]+|\d+|(.)/gm;
    const numbers = /^\d+$/;
    let lastToken: string | null;
    scan();
    return parseRoot();

    function scan() {
        const match = scanner.exec(text);
        if (!match) return lastToken = null;
        if (match[1]) throw new SyntaxError(`Unexpected token '${match[1]}'`);
        return lastToken = match[0];
    }

    function token() {
        return lastToken;
    }

    function parseOptional(pattern: string | RegExp) {
        const tok = token();
        if (tok && (typeof pattern === "string" ? tok === pattern : pattern.test(tok))) {
            scan();
            return tok;
        }
        return null;
    }

    function parseExpected(pattern: string | RegExp) {
        const tok = parseOptional(pattern);
        if (tok) return tok;
        throw new SyntaxError();
    }

    function parseNumber() {
        return parseInt(parseExpected(numbers));
    }

    function parseRoot(): Node | null {
        if (token() === null) return null;
        parseExpected("N");
        const range = parseRange();
        const pretty = token() === "\n";
        const root = parseNodeRest(range, pretty, pretty ? " " : "");
        if (token()) throw new SyntaxError(`Unexpected token '${token()}'`);
        return root;
    }

    function parseNode(pretty: boolean, indent: string): Node | null {
        const range = parseRange();
        return parseNodeRest(range, pretty, indent);
    }

    function parseRange() {
        parseExpected("(");
        const start = parseNumber();
        const end = parseOptional(",") ? parseNumber() : start;
        parseExpected(")");
        return new Range(start, end);
    }

    function parseNodeRest(range: Range, pretty: boolean, indent: string) {
        let left: Node | null = null;
        let right: Node | null = null;
        if (pretty) {
            if (parseOptional("\n")) {
                if (parseOptional(indent)) {
                    left = parseOptional("L") ? parseNode(pretty, indent + " ") : null;
                    if (!left || parseOptional(indent)) {
                        right = parseOptional("R") ? parseNode(pretty, indent + " ") : null;
                    }
                }
            }
        }
        else {
            if (parseOptional("{")) {
                left = parseOptional("L") ? parseNode(pretty, indent) : null;
                right = parseOptional("R") ? parseNode(pretty, indent) : null;
                parseExpected("}");
            }
        }
        return new Node(left, range, right);
    }
}

export function format(root: Node | null, side: "N" | "R" | "L" = "N", pretty?: boolean) {
    return visit(root, side, "");
    function visit(node: Node | null, side: "N" | "R" | "L", indent: string) {
        if (node === null) return "";
        let text = pretty ? indent : "";
        text += side;
        text += node.range.start === node.range.end ? `(${node.range.start})` : `(${node.range.start},${node.range.end})`;
        if (pretty) text += `\n`;
        if (node.left !== null || node.right !== null) {
            if (!pretty) text += `{`;
            text += visit(node.left, "L", pretty ? indent + " " : "");
            text += visit(node.right, "R", pretty ? indent + " " : "");
            if (!pretty) text += `}`;
        }
        return text;
    }
}

function formatArg(arg: any, pretty: boolean) {
    if (typeof arg === "string" && (pretty ? arg.indexOf("{") >= 0 : arg.indexOf("\n") >= 0)) {
        arg = parse(arg);
    }
    if (arg === null || arg instanceof Node) {
        return format(arg, "N", pretty);
    }
    return "" + arg;
}

expect.extend({
    toBeTreeOf(received, expected) {
        const formattedReceived = formatArg(received, /*pretty*/ false);
        const formattedExpected = formatArg(expected, /*pretty*/ false);
        const pass = formattedReceived === formattedExpected;
        const message = pass
            ? () =>
                `${this.utils.matcherHint('.not.toBeTreeOf')}\n\n` +
                `Expected value to not be a tree with the shape:\n` +
                `  ${this.utils.printExpected(formattedExpected)}\n` +
                `Received:\n` +
                `  ${this.utils.printReceived(formattedReceived)}`
            : () => {
                const expand = (<any>this).expand;
                const prettyReceived = formatArg(received, /*pretty*/ true);
                const prettyExpected = formatArg(expected, /*pretty*/ true);
                const diffString = diff(prettyExpected, prettyReceived, { expand });
                return `` +
                    `${this.utils.matcherHint('.toBeTreeOf')}\n\n` +
                    `Expected value to be a tree with the shape:\n` +
                    `  ${this.utils.printExpected(formattedExpected)}\n` +
                    `Received:\n` +
                    `  ${this.utils.printReceived(formattedReceived)}` +
                    (diffString ? `\n\nDifference:\n\n${diffString}` : ``);
            };
        return { message, pass };
    },
    toBeBalanced(received) {
        let pass: boolean;
        if (received === null || received instanceof Node) {
            pass = validate(received);
        }
        else {
            return {
                message: () =>
                    `${this.utils.matcherHint('.toBeValidAvlTree')}\n\n` +
                    `Expected value to be a valid AVL tree, but it was neither a 'Node' nor 'null'\n` +
                    `Received:\n` +
                    `  ${this.utils.printReceived(received)}`,
                pass: false
            }
        }

        const message = pass
            ? () =>
                `${this.utils.matcherHint('.not.toBeValidAvlTree')}\n\n` +
                `Expected value to not be a balanced AVL tree.\n` +
                `Received:\n` +
                `  ${this.utils.printReceived(formatArg(received, /*pretty*/ true))}`
            : () =>
                `${this.utils.matcherHint('.toBeValidAvlTree')}\n\n` +
                `Expected value to be a balanced AVL tree\n` +
                `Received:\n` +
                `  ${this.utils.printReceived(formatArg(received, /*pretty*/ false))}\n\n` +
                `Tree:\n\n` +
                formatArg(received, /*pretty*/ true);

        return { message, pass };

        function validate(T: Node | null): boolean {
            return T === null
                || Math.abs(h(T.left) - h(T.right)) <= 1
                    && validate(T.left)
                    && validate(T.right);
        }

        function h(T: Node | null) {
            return T === null ? 0 : T.height;
        }
    }
});

declare global {
    namespace jest {
        interface Matchers<R> {
            toBeTreeOf(expected: Node | null | string): R;
            toBeBalanced(): R;
        }
    }
}