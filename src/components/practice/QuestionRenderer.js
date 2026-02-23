'use client';

import MCQRenderer from './MCQRenderer';
import ImageChoiceRenderer from './ImageChoiceRenderer';
import TextInputRenderer from './TextInputRenderer';
import FillInTheBlankRenderer from './FillInTheBlankRenderer';
import DragDropRenderer from './DragDropRenderer';
import SortingRenderer from './SortingRenderer';
import FourPicsRenderer from './FourPicsRenderer';
import MeasureRenderer from './MeasureRenderer';
import ShadeGridRenderer from './ShadeGridRenderer';

const RENDERER_MAP = {
    mcq: MCQRenderer,
    imageChoice: ImageChoiceRenderer,
    textInput: TextInputRenderer,
    fillInTheBlank: FillInTheBlankRenderer,
    gridArithmetic: FillInTheBlankRenderer,
    dragAndDrop: DragDropRenderer,
    sorting: SortingRenderer,
    fourPicsOneWord: FourPicsRenderer,
    measure: MeasureRenderer,
    shadeGrid: ShadeGridRenderer,
};

export default function QuestionRenderer({
    question,
    userAnswer,
    onAnswer,
    onSubmit,
    isAnswered,
    isCorrect
}) {
    const normalizedType = String(question.type || '').trim();
    const rendererKey = normalizedType in RENDERER_MAP
        ? normalizedType
        : normalizedType.toLowerCase();
    const Renderer = RENDERER_MAP[rendererKey];

    if (!Renderer) {
        return <div>Unsupported question type: {normalizedType || 'unknown'}</div>;
    }

    return (
        <Renderer
            question={question}
            userAnswer={userAnswer}
            onAnswer={onAnswer}
            onSubmit={onSubmit}
            isAnswered={isAnswered}
            isCorrect={isCorrect}
        />
    );
}
