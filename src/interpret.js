const {
  UNARY,
  BINARY,
  LITERAL,
  VARIABLE,
  GROUP,
  CALL,
  LIST
} = require('./ExpressionTypes')

const {
  createList
} = require('./ExpressionCreators')

const {
  PRINT_STMT,
  EXPR_STMT,
  IF_STMT,
  FN_STMT,
  RETURN_STMT
} = require('./StatementTypes')

const {
  LEFT_PAREN, 
  RIGHT_PAREN,
  LEFT_BRACE,
  RIGHT_BRACE,
  COMMA,
  DOT,
  MINUS,
  PLUS,
  SEMICOLON,
  POUND,
  STAR,
  STAR_STAR,
  CARET,
  EQUAL,
  BANG,
  LESS,
  GREATER,
  BANG_EQUAL,
  EQUAL_EQUAL,
  LESS_EQUAL,
  GREATER_EQUAL,
  STRING,
  NUMBER,
  IDENTIFIER,
  NIL,
  EOF,
  COLON,
  END,
  NOT,
  SLASH,
  AND,
  OR,
  PIPE,
  MAP,
  REDUCE,
  FILTER,
  MODULO
} = require('./TokenTypes')

const isIdentifier      = value => value !== null && typeof value === 'object' && 'type' in value && value.type == IDENTIFIER
const isCallable        = value => typeof value === 'object' && 'call' in value
const isList            = value => typeof value === 'object' && 'type' in value && value.type == LIST
const getValue          = (state, value) => isIdentifier(value) ? state[value.literal] : value
const createTypeChecker = type => (value) => typeof value === type
const isNumber          = createTypeChecker('number')
const isString          = createTypeChecker('string')
const isBoolean         = createTypeChecker('boolean')
const eitherType        = (value, ...typeCheckers) => typeCheckers.some(typeChecker => typeChecker(value))
const ofType            = (typeChecker, ...values) => values.every(value => typeChecker(value))
const allPairs          = (pairs) => pairs.every(pair => pair[1](pair[0]))
const somePairs         = (pairs) => pairs.some(pair => pair[1](pair[0]))

const binaryOps = {
  [PIPE]: (left, right, state) => {
    if (isCallable(right)) {
      return right.call([left])
    } else {
      throw "Sayop nga pag-gamit."
    }
  },
  [MAP]: (left, right, state) => {
    if (isList(left) && isCallable(right)) {
      return createList(left.value.map((x, i, a) => right.call([x, i, a])))
    } else {
      throw "Sayop nga pag-gamit."
    }
  },
  [REDUCE]: (left, right, state) => {
    if (isList(left) && isCallable(right)) {
      return left.value.reduce((acc, x, i, a) => right.call([acc, x, i, a]))
    } else {
      throw "Sayop nga pag-gamit."
    }
  },
  [FILTER]: (left, right, state) => {
    if (isList(left) && isCallable(right)) {
      return createList(left.value.filter((x, i, a) => right.call([x, i, a]) === "tuod" ))
    } else {
      throw "Sayop nga pag-gamit."
    }
  },
  [PLUS]: (left, right, state) => {
    if (eitherType(left, isNumber, isString) && eitherType(right, isNumber, isString)) {
      return left + right
    } else {
      throw "Sayop nga pag-dugang."
    }
  },
  [MINUS]: (left, right, state) => {
    if (ofType(isNumber, left, right)) {
      return left - right
    } else {
      throw "Dire pwede mag-iban dire numero."
    }
  },
  [STAR]: (left, right, state) => {
    if (ofType(isNumber, left, right)) {
      return left * right
    } else if (allPairs([[left, isNumber], [right, isString]])) {
      return right.repeat(left)
    } else if (allPairs([[left, isString], [right, isNumber]])) {
      return left.repeat(right)
    } else {
      throw "Sayop nga pag multiply."
    }
  },
  [SLASH]: (left, right, state) => {
    if (ofType(isNumber, left, right)) {
      return left / right
    } else {
      throw "Sayop nga pag divide."
    }
  },
  [MODULO]: (left, right, state) => {
    if (ofType(isNumber, left, right)) {
      return left % right
    } else {
      throw "Sayop nga pag modulo."
    }
  },
  [STAR_STAR]: (left, right, state) => {
    if (ofType(isNumber, left, right)) {
      return Math.pow(left, right)
    } else {
      throw "Sayop nga pag exponent."
    }
  },
  [CARET]: (left, right, state) => {
    if (ofType(isNumber, left, right)) {
      return Math.pow(left, right)
    } else {
      throw "Sayop nga pag exponent."
    }
  },
  [AND]: (left, right) => {
    if (ofType(isBoolean, left, right)) {
      return left && right
    } else {
      throw "Syntax error."
    }
  },
  [OR]: (left, right) => {
    if (ofType(isBoolean, left, right)) {
      return left || right
    } else {
      throw "Sayop."
    }
  },
  [EQUAL_EQUAL]: (left, right) => {
    return left === right
  },
  [BANG_EQUAL]: (left, right) => {
    return left !== right
  },
  [LESS]: (left, right) => {
    if (ofType(isNumber, left, right)) {
      return left < right
    } else {
      throw "Sayop."
    }
  },
  [GREATER]: (left, right) => {
    if (ofType(isNumber, left, right)) {
      return left > right
    } else {
      throw "Sayop."
    }
  },
  [LESS_EQUAL]: (left, right) => {
    if (ofType(isNumber, left, right)) {
      return left <= right
    } else {
      throw "Sayop."
    }
  },
  [GREATER_EQUAL]: (left, right) => {
    if (ofType(isNumber, left, right)) {
      return left >= right
    } else {
      throw "Sayop."
    }
  },
  [EQUAL]: (left, right, state) => {
    if (left.literal in state) {
      throw `Mayda na "${left.literal}".`
    } else {
      state[left.literal] = right
    }
    
    return right
  }
}

const unaryOps = {
  [NOT]: value => {
    if (somePairs([[value, isBoolean], [value, isNumber]])) {
      return !value
    } else {
      throw "Sayop."
    }
  },
  [MINUS]: value => {
    if (isNumber(value)) {
      return -value
    } else {
      throw "Sayop."
    }
  }
}

const expressionVisitors = {
  [BINARY]: (node, state) => {
    try {
      const left = expressionVisitors[node.left.type](node.left, state)
      const right = expressionVisitors[node.right.type](node.right, state)
      const leftValue = getValue(state, left)
      const rightValue = getValue(state, right)

      if (isIdentifier(left) && node.value.type == EQUAL) {
        return binaryOps[node.value.type](left, right, state)
      }
      else if (node.value.type in binaryOps) {
        return binaryOps[node.value.type](leftValue, rightValue, state)
      } else {
        throw `Sayop nga operasyon.`
      }
    } catch(e) {
      throw `May sayop ka ha linya ${node.value.line}: ${e}.`
    }
  },
  [UNARY]: (node, state) => {
    try {
      const right = expressionVisitors[node.right.type](node.right)
      const rightValue = getValue(state, value)

      if (node.value.type in unaryOps) {
        return unaryOps[node.value.type](rightValue, state)
      } else {
        throw `May sayop ka ha linya ${node.value.line}.`
      }
    } catch(e) {
      throw `May sayop ka ha linya ${node.value.line}.`
    }
    
  },
  [CALL]: (node, state) => {
    const functionName = node.value.value.literal

    if (!(functionName in state)) throw `Waray butang nga an ngaran "${functionName}"`
    if (!(typeof state[functionName] === 'object') || !("call" in state[functionName])) throw `Diri hirimuon it "${functionName}"`
    const functionValue = state[functionName].call(node.args, state)

    return functionValue
  },
  [LIST]: (node, state) => {
    const contents = node.value.map(content => expressionVisitors[content.type](content))
    return {type: LIST, value: contents}
  },
  [VARIABLE]: node => node.value,
  [LITERAL]: node => node.value,
  [GROUP]: (node, state) => expressionVisitors[node.value.type](node.value, state)
}

const statementVisitors = {
  [PRINT_STMT]: (statement, state) => {
    // TODO: Create filters for type simplification e.g. {type: LIST, value} to "value"
    const result = expressionVisitors[statement.value.type](statement.value, state)
    const evaluatedResult = isIdentifier(result) && result.literal in state ? state[result.literal] : isIdentifier(result) ? undefined : result
    const filteredResult = evaluatedResult === null || evaluatedResult === undefined ? "waray" : evaluatedResult === true ? "tuod" : evaluatedResult === false ? "buwa" : evaluatedResult
    const convertedResult = isList(filteredResult) ? filteredResult.value : filteredResult

    console.log(convertedResult)
  },
  [EXPR_STMT]: (statement, state) => {
    return expressionVisitors[statement.value.type](statement.value, state)
  },
  [IF_STMT]: (statement, state) => {
    const condition = expressionVisitors[statement.value.type](statement.value, state)

    return condition === true
      ? statement.left.reduce((acc, val) => {
        const result = statementVisitors[val.type](val, state)
        if (val.type == RETURN_STMT) return val
      }, null)
      : statement.right && statement.right.reduce((acc, val) => {
        const result = statementVisitors[val.type](val, state)
        if (val.type == RETURN_STMT) return val
      }, null)
  },
  [FN_STMT]: (statement, state) => {
    createCallable(statement, state)
  },
  [RETURN_STMT]: (statement, state) => {
    const result = expressionVisitors[statement.value.type](statement.value, state)
    const evaluatedValue = isIdentifier(result) && result.literal in state ? state[result.literal] : isIdentifier(result) ? undefined : result
    const filteredResult = evaluatedValue === null || evaluatedValue === undefined ? "waray" : evaluatedValue === true ? "tuod" : evaluatedValue === false ? "buwa" : evaluatedValue

    return filteredResult
  }
}

const createCallable = (statement, state) => {
  if (statement.value.literal in state) {
    throw `Mayda na hirimuon nga "${statement.value.literal}"`
  }

  const fnCall = (args, stt) => {
    const evaluatedArgs = args.reduce((acc, arg) => {
      if (typeof arg !== 'object') {
        return [...acc, arg]
      } else if ('type' in arg) {
        return [...acc, expressionVisitors[arg.type](arg, stt)]
      } else {
        return acc
      }
    }, [])
    
    const argState = evaluatedArgs.reduce((acc, arg, index) => {
      if (!(index in statement.params)) return acc
      return Object.assign({}, acc, {[statement.params[index].literal]: arg})
    }, {})

    const fnState = Object.assign({}, stt, argState)

    return statement.body.reduce((acc, st) => {
      if (acc === undefined || acc === null) {
        const result = statementVisitors[st.type](st, fnState)
        return st.type == RETURN_STMT ? result : typeof result !== 'undefined' && result !== null && result.type == RETURN_STMT ? statementVisitors[result.type](result, fnState) : acc
      } else {
        return acc
      }        
    }, null)
  }

  state[statement.value.literal] = {
    call: fnCall
  }

  return state[statement.value.literal]
}

const MODE_INTERPRET = Symbol.for('interpret'),
      MODE_TRANSPILE = Symbol.for('transpile')

const LANG_WARAY   = Symbol.for('waray'),
      LANG_TAGALOG = Symbol.for('tagalog')

const interpret = (mode=MODE_INTERPRET, lang=LANG_WARAY) => statements => {
  const state = {}

  try {
    for (statement of statements) {
      statementVisitors[statement.type](statement, state)
    }

    return 0
  } catch(e) {
    console.log(e)
    return -1
  }
}

module.exports = interpret