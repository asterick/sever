const { describe, expect, test } = require('@jest/globals');
const sever = require("..");

describe('can be stateful', () => {
    test('next works as expected', () => {
        const lexer = sever.states({
            main: {
                open: { match: '"', next: 'string', discard: true },
                WS: { match:/\s+/, discard: true },
                word: /[^"]+/
            },
            string: {
                close: { match: '"', next: 'main', discard: true },
                escaped: /\\./,
                character: /[^"]/
            }
        });

        lexer.reset('Ident "\\n1" Ident');

        expect(lexer.next()).toEqual({
            type: 'word',
            match: 'Ident ',
            value: 'Ident ',
            col: 1,
            line: 1,
            offset: 0,
            lineFeeds: 0
        });

        expect(lexer.next()).toEqual({
            type: 'escaped',
            match: '\\n',
            value: '\\n',
            col: 8,
            line: 1,
            offset: 7,
            lineFeeds: 0
        });

        expect(lexer.next()).toEqual({
            type: 'character',
            match: '1',
            value: '1',
            col: 10,
            line: 1,
            offset: 9,
            lineFeeds: 0
        });

        expect(lexer.next()).toEqual({
            type: 'word',
            match: 'Ident',
            value: 'Ident',
            col: 13,
            line: 1,
            offset: 12,
            lineFeeds: 0
        });
    });

    test('push/pop works as expected', () => {
        const common = {
            open_words: { match: '{', push: 'words', discard: true },
            open_numbers: { match: '[', push: 'numbers', discard: true },
            close_words: { match: '}', pop: 1, discard: true },
            close_numbers: { match: ']', pop: 1, discard: true },
            WS: { match:/\s+/, discard: true },
        };

        const lexer = sever.states({
            words: {
                ... common,
                word: /[a-z]+/
            },
            numbers: {
                ... common,
                number: /[0-9]+/
            }
        });

        lexer.reset("asdf { asdf [ 1234 { asdf } [ 1234 ] ] fdas } fdas")

        expect(lexer.next().type).toBe("word");
        expect(lexer.next().type).toBe("word");
        expect(lexer.next().type).toBe("number");
        expect(lexer.next().type).toBe("word");
        expect(lexer.next().type).toBe("number");
        expect(lexer.next().type).toBe("word");
        expect(lexer.next().type).toBe("word");
    });
});
