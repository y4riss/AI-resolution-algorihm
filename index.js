const VARIABLE = "variable";
const NEGATION = "negation";
const DISJUNCTION = "disjunction";
const CONJUNCTION = "conjunction";
const CONDITION = "condition";

const variable = (name) => ({ type: VARIABLE, name });
const not = (formula) => ({ type: NEGATION, formula });
const connective = (type, left, right) => ({ type, left, right });
const or = connective.bind(null, DISJUNCTION);
const and = connective.bind(null, CONJUNCTION);
const implies = connective.bind(null, CONDITION);

/**
    Expression is CNF if : 
    - It is an atom : P,Q,S...
    - It is a negation of atom : ~P , ~Q , ~S ...

    - Formula is of DISJONCTION type
      - Left part is either : atom | negation of atom | DISJONCTION
      - Right part is either :  atom | negation of atom | DISJONCTION

    - Formula is of CONJUNCTION type
      - Left part is either a valid CNF, or a valid DISJONCTION
      - Right part is either a valid CNF, or a valid DISJONCTION

 */
function isCnf(formula) {
  return (
    isCnfDisjunction(formula) ||
    (formula.type == CONJUNCTION &&
      (isCnf(formula.left) || isCnfDisjunction(formula.left)) &&
      (isCnf(formula.right) || isCnfDisjunction(formula.right)))
  );
}

function isCnfDisjunction(formula) {
  return (
    isCnfAtom(formula) ||
    (formula.type == DISJUNCTION &&
      (isCnfDisjunction(formula.left) || isCnfAtom(formula.left)) &&
      (isCnfDisjunction(formula.right) || isCnfAtom(formula.right)))
  );
}

function isCnfAtom(formula) {
  return (
    formula.type == VARIABLE ||
    (formula.type == NEGATION && formula.formula.type == VARIABLE)
  );
}
// A v B


function cnf(formula) {
  if (isCnf(formula)) {
    return formula;
  }
  switch (formula.type) {
    case NEGATION:
      return negatedCnf(formula.formula);
    case CONJUNCTION:
      return and(cnf(formula.left), cnf(formula.right));
    case DISJUNCTION:
      let left = cnf(formula.left);
      let right = cnf(formula.right);
      return left.type != CONJUNCTION
        ? right.type != CONJUNCTION
          ? or(left, right)
          : cnf(and(or(left, right.left), or(left, right.right)))
        : right.type != CONJUNCTION
        ? cnf(and(or(left.left, right), or(left.right, right)))
        : cnf(
            and(
              or(left.left, right.left),
              and(
                or(left.left, right.right),
                and(or(left.right, right.left), or(left.right, right.right))
              )
            )
          );
    case CONDITION:
      return cnf(or(not(formula.left), formula.right));
  }
}

function negatedCnf(formula) {
  switch (formula.type) {
    case NEGATION:
      return cnf(formula.formula);
    case DISJUNCTION:
      return cnf(and(not(formula.left), not(formula.right)));
    case CONJUNCTION:
      return cnf(or(not(formula.left), not(formula.right)));
    case CONDITION:
      return cnf(and(formula.left, not(formula.right)));
  }
}

// String conversion functions
function group(formula) {
  if ([VARIABLE, NEGATION].includes(formula.type)) {
    return stringify(formula);
  }
  return "(" + stringify(formula) + ")";
}

// parser : formula representation to string representation
// not(and(variable(P),variable(Q)) becomes ~(P ^ Q)
function stringify(formula) {
  switch (formula.type) {
    case VARIABLE:
      return formula.name;
    case NEGATION:
      return "~" + group(formula.formula);
    case CONJUNCTION:
      return group(formula.left) + "^" + group(formula.right);
    case DISJUNCTION:
      return group(formula.left) + "v" + group(formula.right);
    case CONDITION:
      return group(formula.left) + "→" + group(formula.right);
  }
}

//Operator-precedence_parser
function precedence(expression) {
  const L = expression.length;
  let output = "((";
  const preced = {
    "^": ")^(",
    v: "))v((",
    "→": "))→((",
    "(": "((",
    ")": "))",
  };
  for (let i = 0; i < L; i++) {
    if (preced[expression[i]]) {
      output += preced[expression[i]];
    } else output += expression[i];
  }

  return output + "))";
}

// parser : string to formula representations
// ~(P ^ Q) becomes not(and(variable(P),variable(Q))
function parse(str) {
  const iter = str[Symbol.iterator]();

  function recur(end) {
    let formula;
    const connectives = [];
    for (const ch of iter) {
      if (ch === end) break;
      if ("^v~→".includes(ch)) {
        connectives.push(ch);
      } else {
        let arg = ch == "(" ? recur(")") : variable(ch);
        while (connectives.length) {
          const oper = connectives.pop();
          arg =
            oper == "~"
              ? not(arg)
              : oper == "^"
              ? and(formula, arg)
              : oper == "v"
              ? or(formula, arg)
              : implies(formula, arg);
        }
        formula = arg;
      }
    }
    return formula;
  }
  return recur();
}
/*
{
  "P" : 0
  "Q" : 0
}
[~P, Q, P v Q]
*/

const valide = (clauses) => {
  const atoms = [];
  const notAtoms = {};

  clauses.forEach((clause) => {
    const updatedClause =
      clause[0] == "(" ? clause.slice(1, clause.length - 1) : clause;
    const singleAtoms = updatedClause.split("v");
    singleAtoms.forEach((atom) => {
      atoms.push(atom);
      if (atom[0] == "~") {
        if (notAtoms[atom]) notAtoms[atom] += 1;
        else notAtoms[atom] = 1;
      } else {
        const notAtom = "~" + atom;
        if (notAtoms[notAtom]) notAtoms[notAtom] -= 1;
        else notAtoms[notAtom] = -1;
      }
    });
  });
  for (let a in notAtoms) {
    if (notAtoms[a]) {
      return 0;
    }
  }
  return 1;
};

const checkStrValidity = (str, whiteList) => {
  for (let i = 0; i < str.length; i++) {
    if (!whiteList.includes(str[i])) return false;
  }

  return true;
};

function domResult(formula, notFormula, cnf, clauses, isValid) {
  const domFormula = document.querySelector(".formula");
  const domNotFormula = document.querySelector(".notFormula");
  const domCnf = document.querySelector(".cnf");
  const domClauses = document.querySelector(".ul2");
  const domResult = document.querySelector(".result");

  domFormula.textContent = formula;
  domNotFormula.textContent = notFormula;
  domCnf.textContent = cnf;
  clauses.forEach((clause) => {
    console.log(clause);
    const li = document.createElement("li");
    li.textContent = clause;
    domClauses.appendChild(li);
  });
  domResult.textContent = isValid ? "valide" : "invalide";
}

function clearDom() {
  const span = document.querySelectorAll("span");
  document.querySelector(".ul2").innerHTML = "";
  span.forEach((s) => (s.innerHTML = ""));
}
(function entrypoint() {
  const alpha = "abcdefghijklmnopqrstuvwxyz";
  const whiteList = "~v^>()→" + alpha + alpha.toUpperCase();
  const checkBtn = document.querySelector("#check");
  const clearBtn = document.querySelector("#clear");

  clearBtn.addEventListener("click", () => {
    document.querySelector("#output").textContent = "";
  });
  checkBtn.addEventListener("click", () => {
    clearDom();
    const originalFormula = document.querySelector("#output").textContent;

    console.log(originalFormula);
    if (!checkStrValidity(originalFormula, whiteList)) {
      console.log("invalid characters in formula");
      return;
    }

    const formula = parse(precedence(originalFormula));
    console.log(JSON.stringify(formula));
    const toStrFormula = stringify(formula);
    const notFormula = "~(" + toStrFormula + ")";
    const cnfFormula = cnf(parse(notFormula));
    const cnfFormulaStr = stringify(cnfFormula);
    const clauses = cnfFormulaStr.toString().split("^");
    for (let i = 0; i < clauses.length; i++) {
      clauses[i] = clauses[i].replace(/(\(|\))/g, "");
    }
    console.log("clauses : ", clauses);
    const isValid = valide(clauses);

    domResult(toStrFormula, notFormula, cnfFormulaStr, clauses, isValid);
    console.log("Formula : ", toStrFormula);
    console.log("Negation of Formula : ", notFormula);
    console.log("CNF of ~Formula: ", cnfFormulaStr);
  });
})();
