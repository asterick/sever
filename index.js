/**
 * BSD 3-Clause License
 *
 * Copyright (c) 2022, R. Bryon Vandiver (asterick)
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * 1. Redistributions of source code must retain the above copyright notice, this
 *    list of conditions and the following disclaimer.
 *
 * 2. Redistributions in binary form must reproduce the above copyright notice,
 *    this list of conditions and the following disclaimer in the documentation
 *    and/or other materials provided with the distribution.
 *
 * 3. Neither the name of the copyright holder nor the names of its
 *    contributors may be used to endorse or promote products derived from
 *    this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
 * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
 * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
 * OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

(function(root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory()
    } else {
        root.tokenize = factory()
    }
}(this, function() {
    'use strict';

    const regExpSpecial = /(\/|\.|\*|\+|\?|\||\(|\)|\[|\]|\{|\}|\\)/g;
    const lineBreakExp = /\r\n?|\n\r?/gm;
    let safeNameIndex = 0;

    function safeName() {
        return `t${safeNameIndex++}`;
    }

    class Tokenizer {
        constructor(transforms, base, names, states = null) {
            this.ownedTokens = names;
            this.states = states;
            this.transforms = transforms;
            this.stack = [];
            this.done = true;
            this.location = {
                col: 1,
                line: 1
            };

            Object.assign(this, base);
        }

        reset (source, state = null) {
            if (state) {
                const { lastIndex } = state;
                this.regExp.lastIndex = lastIndex;
                Object.assign(this.location, state);
            } else {
                this.regExp.lastIndex = 0;
            }

            this.source = source;
            this.done = false;
        }

        save () {
            return { ... this.location, index: this.regExp.lastIndex };
        }

        has (name) {
            return this.ownedTokens.has(name);
        }

        // == Iteration ==
        *[Symbol.iterator] () {
            let value;
            while ((value = this.next()) !== undefined) {
                yield value;
            }
        }

        // == State Operations ==
        nextState (name) {
            const lastIndex = this.regExp.lastIndex;
            Object.assign(this, this.states[name]);
            this.regExp.lastIndex = lastIndex;
        }

        pushState (name) {
            this.stack.push({
                regExp: this.regExp,
                next: this.next
            });

            this.nextState(name);
        }

        popState () {
            const lastIndex = this.regExp.lastIndex;
            Object.assign(this, this.stack.pop());
            this.regExp.lastIndex = lastIndex;
        }

        // == Internal ==
        lineBreak(token) {
            const lines = token.split(lineBreakExp);
            const breaks = lines.length - 1;

            if (breaks > 0) {
                this.location.line += breaks;
                this.location.col = lines[breaks].length + 1;
            } else {
                this.location.col += lines[0].length;
            }

            return breaks;
        }

        // == Debug ==
        formatError (token, error = "Error") {
            const lineExp = /.*/y;
            lineExp.lastIndex = token.index - token.col + 1;
            const line = lineExp.exec(this.source);
            console.log(this.source.substring(token.index - token.col + 1))

            return `Error: ${error} at line ${token.line} col ${token.col}:\n\n${line}\n${" ".repeat(token.col-1)}^`;
        }

        debug () {
            console.log("Stack", this.stack);
            console.log("Done", this.done);
            console.log("RegExp", this.regExp);
            console.log("Next", this.next.toString());
            console.log("Location", JSON.stringify(this.location));
            console.log("States", this.states);
        }
    }

    function toRegExp(token) {
        if (typeof token === "string") {
            return token.replace(regExpSpecial, '\\$1');
        } else if (token instanceof RegExp) {
            return token.source;
        } else if (Array.isArray(token)) {
            return token.map(toRegExp).join("|");
        }

        console.log(token)
        throw new Error("Unhandled type, expected String, RegExp, or Array[RegExp, Spring]")
    }

    function* matchExpressions(states) {
        for (const [type, token] of Object.entries(states)) {
            if (Array.isArray(token) && token.length >= 1 && token[0].match) {
                for (let child of token) {
                    if (typeof child !== "object" || !child.match) {
                        throw new Error("Bad topology");
                    }
                    yield [type, toRegExp(child.match), token];
                }
            } else if (typeof token === "object" && token.match) {
                yield [type, toRegExp(token.match), token]
            } else {
                yield [type, toRegExp(token), {}]
            }
        }
    }

    function build(states, transforms) {
        const tests = ['if(match===null){}'];
        const exprs = [];
        let index = 1;

        for (let [type, expr, options] of matchExpressions(states)) {
            const dummyMatch = new RegExp(`|${expr}`).exec('');
            const isNamed = dummyMatch.groups !== undefined, length = dummyMatch.length;

            // == Word breaks ==
            if (options.wordBound) {
                expr = `(?:${expr})\\b`;
            }
            exprs.push(expr);

            // == Fetch value of the token ==
            let value;
            if (typeof options.value === "function") {
                const valueFuncName = safeName();
                transforms[valueFuncName] = options.value;

                if (isNamed) {
                    value = `this.transforms.${valueFuncName}(match[${index}],match.groups)`;
                } else if (length > 1) {
                    value = `this.transforms.${valueFuncName}(...match.slice(${index},${index + length}))`;
                } else {
                    value = `this.transforms.${valueFuncName}(match[${index}])`;
                }
            } else {
                value = `match[0]`;
            }

            // == Update line/column ==
            let body;
            if (options.discard) {
                if (options.lineBreaks) {
                    body = `this.lineBreak(match[0]);`
                } else {
                    body = `this.location.col+=match[0].length`;
                }
            } else {
                body = `const data={type:${JSON.stringify(type)},match:match[0],value:${value},...this.location,index:match.index,lineFeeds:0}`;
                if (options.lineBreaks) {
                    body = `${body};data.lineFeeds=this.lineBreak(match[0])`;
                } else {
                    body = `${body};this.location.col+=match[0].length`;
                }
            }

            // == Errors ==
            if (options.error) {
                body += ';this.done = true';
            }

            // == States ==
            if (options.push) {
                body += `;this.pushState(${JSON.stringify(options.push)})`;
            } else if (options.next) {
                body += `;this.nextState(${JSON.stringify(options.next)})`;
            } else if (options.pop) {
                body += `;this.popState()`;
            }

            // == Continue or Discard ==
            if (options.discard) {
                if (options.push || options.pop || options.next) {
                    body = `${body};return this.next()`;
                } else {
                    body = `${body};continue`;
                }
            } else {
                body = `${body};return data`;
            }

            tests.push(`if(match[${index}]!==undefined){${body}}`)

            index += length;
        }

        const regExp = new RegExp(`(${exprs.join(")|(")})`, "ym");
        const body = `while(!this.done){const match=this.regExp.exec(this.source)\n${tests.join("else ")}\nthis.done=true\nbreak}`;
        const next = new Function(body);

        return { next, regExp };
    }

    function compile(state) {
        const transforms = {};
        return new Tokenizer(transforms, build(state, transforms), new Set(Object.keys(state)));
    }

    function states(states) {
        const transforms = {};
        let names = [];
        let base = null;

        const compiled = Object.entries(states).reduce((states, [name, state]) => {
            const compiled = build(state, transforms);
            states[name] = compiled;
            base = base || compiled;

            names.push(... Object.keys(state).filter((n) => !state[n].discard));

            return states;
        }, {});

        return new Tokenizer(transforms, base, new Set(names), compiled);
    }

    return {
        error: { match: /\W+|\s+/, error: true },
        compile, states
    };
}));
