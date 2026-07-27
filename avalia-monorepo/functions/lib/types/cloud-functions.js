"use strict";
// Cloud Functions specific types - minimal subset of @avalia/core types
// This avoids pulling in the full @avalia/core package which causes compilation issues
Object.defineProperty(exports, "__esModule", { value: true });
exports.HintType = exports.QuizFormat = exports.TopicMode = exports.Difficulty = void 0;
var Difficulty;
(function (Difficulty) {
    Difficulty["EASY"] = "F\u00E1cil";
    Difficulty["MEDIUM"] = "M\u00E9dio";
    Difficulty["HARD"] = "Dif\u00EDcil";
})(Difficulty || (exports.Difficulty = Difficulty = {}));
var TopicMode;
(function (TopicMode) {
    TopicMode["ACADEMIC"] = "Acad\u00EAmico";
    TopicMode["ENTERTAINMENT"] = "Entretenimento";
    TopicMode["ARTS_CULTURE"] = "Arte & Cultura";
    TopicMode["GEOPOLITICS"] = "Geopol\u00EDtica";
    TopicMode["ANIMALS"] = "Mundo Animal";
    TopicMode["OTHER"] = "Outro Assunto";
})(TopicMode || (exports.TopicMode = TopicMode = {}));
var QuizFormat;
(function (QuizFormat) {
    QuizFormat["MULTIPLE_CHOICE"] = "M\u00FAltipla Escolha";
    QuizFormat["TRUE_FALSE"] = "Verdadeiro ou Falso";
    QuizFormat["OPEN_ENDED"] = "Resposta Livre (IA)";
})(QuizFormat || (exports.QuizFormat = QuizFormat = {}));
var HintType;
(function (HintType) {
    HintType["STANDARD"] = "Dica Padr\u00E3o";
    HintType["ASK_AI"] = "Pergunte ao Chat";
})(HintType || (exports.HintType = HintType = {}));
//# sourceMappingURL=cloud-functions.js.map