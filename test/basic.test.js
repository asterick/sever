const { describe, expect, test } = require('@jest/globals');
const sever = require("..");

describe('basic functionality', () => {
    test('can match basic token types', () => {
        const lexer = sever.compile({
            WS: /\s+/,
            Number: /\d+/,
            Identifier: /\w+/,
            Operator: /[^\s\w\d]+/
        });

        lexer.reset("Hello 10 times!");
        expect(lexer.next().type).toBe('Identifier');
        expect(lexer.next().type).toBe('WS');
        expect(lexer.next().type).toBe('Number');
        expect(lexer.next().type).toBe('WS');
        expect(lexer.next().type).toBe('Identifier');
        expect(lexer.next().type).toBe('Operator');
        expect(lexer.next()).toBeUndefined();
    });

    test('.has() works as expected', () => {
        /* Stateless tokenzizer */
        const basic = sever.compile({
            WS: /\s+/,
            Number: /\d+/,
            Identifier: /\w+/,
            Operator: /[^\s\w\d]+/
        });

        expect(basic.has("WS")).toBeTruthy();
        expect(basic.has("Operator")).toBeTruthy();
        expect(basic.has("Comment")).toBeFalsy();

        /* Stateful parser */
        const stateful = sever.states({
            main: {
                WS: /\s+/,
                Number: /\d+/,
            },
            sub: {
                Identifier: /\w+/,
                Operator: /[^\s\w\d]+/
            }
        });

        expect(stateful.has("WS")).toBeTruthy();
        expect(stateful.has("Operator")).toBeTruthy();
        expect(stateful.has("Comment")).toBeFalsy();
    });

    test('is iterable', () => {
        const lexer = sever.compile({
            WS: /\s+/,
            Number: /\d+/,
            Identifier: /\w+/,
            Operator: /[^\s\w\d]+/
        });

        lexer.reset("Hello 10 times!");
        let values = 0;

        for (let token of lexer) {
            expect(token).toBeTruthy();
            values ++;
        }

        expect(values).toBe(6);
    });

    test('can be saved and restored', () => {
        const source = "Hello 10 times!";
        const lexer = sever.compile({
            WS: /\s+/,
            Number: /\d+/,
            Identifier: /\w+/,
            Operator: /[^\s\w\d]+/
        });

        /* Move into the parser */
        lexer.reset(source);
        expect(lexer.next()).toEqual({
            type: 'Identifier',
            match: 'Hello',
            value: 'Hello',
            col: 1,
            line: 1,
            offset: 0,
            lineFeeds: 0
        });

        /* Run a first pass, preserving the results */
        const saved = lexer.save();
        const tokens = [];
        for (let token of lexer) {
            expect(token).toBeTruthy();
            tokens.push(token);
        }

        /* Run a second pass, and verify that the value are the same */
        lexer.reset(source, saved);
        for (token of tokens) {
            expect(token).toEqual(lexer.next());
        }
    });
});
