const { describe, expect, test } = require('@jest/globals');
const sever = require("..");

describe('value transforms', () => {
    test('work for basic expressions', () => {
        const lexer = sever.compile({
            ws: { match: /\s+/, discard: true },
            number: { match: /\d+/, value: (match) => parseInt(match) }
        });

        lexer.reset("1 2 3");
        expect(lexer.next().value).toBe(1);
        expect(lexer.next().value).toBe(2);
        expect(lexer.next().value).toBe(3);
    });

    test('can work on capture groups', () => {
        const lexer = sever.compile({
            ws: { match: /\s+/, discard: true },
            number: { match: /(\d+).(\d+)/, value: (match, a, b) => [match, a, b] }
        });

        lexer.reset("1.2 2.3 3.4");
        expect(lexer.next().value).toEqual(["1.2", "1", "2"]);
        expect(lexer.next().value).toEqual(["2.3", "2", "3"]);
        expect(lexer.next().value).toEqual(["3.4", "3", "4"]);
    })

    test('can work on named capture groups', () => {
        const lexer = sever.compile({
            ws: { match: /\s+/, discard: true },
            number: { match: /(?<a>\d+).(?<b>\d+)/, value: (match, groups) => [match, groups] }
        });

        lexer.reset("1.2 2.3 3.4");
        expect(lexer.next().value).toEqual(["1.2", {a: "1", b: "2"}]);
        expect(lexer.next().value).toEqual(["2.3", {a: "2", b: "3"}]);
        expect(lexer.next().value).toEqual(["3.4", {a: "3", b: "4"}]);
    })
});
