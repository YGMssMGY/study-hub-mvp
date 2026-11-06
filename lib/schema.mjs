const str = (maxLength = 2000) => ({ type: 'string', maxLength });
const array = (items, minItems = 0, maxItems = 20) => ({ type: 'array', items, minItems, maxItems });
const obj = properties => ({ type: 'object', properties, required: Object.keys(properties), additionalProperties: false });
const outlineSchema = array(obj({ text: str(900), children: array(obj({ text: str(700), children: array(str(500), 0, 4) }), 0, 4) }), 1, 7);

export const questionSchema = obj({
  id: str(80), subtopicId: str(80), kind: { type: 'string', enum: ['multiple-choice', 'written'] },
  prompt: str(3000), options: array(str(1000), 0, 4), answer: str(2500),
  explanation: str(2500), source: str(300), origin: { type: 'string', enum: ['uploaded', 'generated'] }
});
export const topicsSchema = array(obj({
  id: str(80), title: str(160), subtopics: array(obj({
    id: str(80), title: str(160), section: str(160), content: str(2000), outline: outlineSchema, source: str(300)
  }), 1, 6)
}), 1, 6);
export const studySchema = obj({
  title: str(160), summary: str(3000), topics: topicsSchema, questions: array(questionSchema, 2, 16)
});
export const questionsSchema = obj({ questions: array(questionSchema, 1, 8) });
export const tutorReplySchema = obj({ reply: str(4000) });
export const tutorQuizSchema = obj({
  question: str(1500), choices: array(str(400), 4, 5), correct: array({ type: 'number' }, 1, 5), explanation: str(1200), source: str(20)
});
export const gradeSchema = obj({
  correct: { type: 'boolean' }, feedback: str(2000), clarification: str(1500), referenceAnswer: str(2500)
});

export function validateSchema(value, schema, path = 'response') {
  if (schema.type === 'object') {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${path} must be an object`);
    for (const key of schema.required) if (!(key in value)) throw new Error(`${path}.${key} is missing`);
    for (const key of Object.keys(value)) {
      if (!schema.properties[key]) throw new Error(`${path}.${key} is unexpected`);
      validateSchema(value[key], schema.properties[key], `${path}.${key}`);
    }
  } else if (schema.type === 'array') {
    if (!Array.isArray(value) || value.length < schema.minItems || value.length > schema.maxItems) throw new Error(`${path} has an invalid length`);
    value.forEach((item, i) => validateSchema(item, schema.items, `${path}[${i}]`));
  } else if (typeof value !== schema.type) throw new Error(`${path} has an invalid type`);
  if (schema.type === 'string' && value.length > schema.maxLength) throw new Error(`${path} is too long`);
  if (schema.enum && !schema.enum.includes(value)) throw new Error(`${path} has an invalid value`);
  return value;
}
