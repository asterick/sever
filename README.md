My tokenizer that is compatible with moo, but supports capture groups and is not nearly as backwards compatible.

Accepted topolgy

RULE: RegExp
RULE: String
RULE: OptionObject
RULE: [
    RegExp,
    String,
    OptionObject
]

OptionObject.match:
RegExp
String
Array[String,RegExp]
