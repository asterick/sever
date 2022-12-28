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
            text: 'Hello',
            value: 'Hello',
            col: 1,
            line: 1,
            offset: 0,
            lineBreaks: 0
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

    test('can support arrays of optioned tokens', () => {
        const lexer = sever.compile({
            WS: { match: /\s+/, discard: true },
            Number: [
                { match: /0[xX]([\da-fA-F]+)(\.[\da-fA-F]+)?([pP][-+]?[\da-fA-F]+)?/, value: (_, int, frac, exp) => _ },
                { match: /(\d+)(\.\d+)?([eE][-+]?\d+)?/, value: (_, int, frac, exp) => _ },
            ]
        });

        lexer.reset("3 345 0xff 0xBEBADA 3.0 3.1416 314.16e-2 0.31416E1 34e1 0x0.1E 0xA23p-4 0X1.921FB54442D18P+1");

        expect(lexer.next()).toEqual(expect.objectContaining({
            text: "3"
        }));

        expect(lexer.next()).toEqual(expect.objectContaining({
            text: "345"
        }));

        expect(lexer.next()).toEqual(expect.objectContaining({
            text: "0xff"
        }))

        expect(lexer.next()).toEqual(expect.objectContaining({
            text: "0xBEBADA"
        }))

        expect(lexer.next()).toEqual(expect.objectContaining({
            text: "3.0"
        }))

        expect(lexer.next()).toEqual(expect.objectContaining({
            text: "3.1416"
        }))

        expect(lexer.next()).toEqual(expect.objectContaining({
            text: "314.16e-2"
        }))

        expect(lexer.next()).toEqual(expect.objectContaining({
            text: "0.31416E1"
        }))

        expect(lexer.next()).toEqual(expect.objectContaining({
            text: "34e1"
        }))

        expect(lexer.next()).toEqual(expect.objectContaining({
            text: "0x0.1E"
        }))

        expect(lexer.next()).toEqual(expect.objectContaining({
            text: "0xA23p-4"
        }))

        expect(lexer.next()).toEqual(expect.objectContaining({
            text: "0X1.921FB54442D18P+1"
        }))

        expect(lexer.next()).toBeUndefined();
    })
});
