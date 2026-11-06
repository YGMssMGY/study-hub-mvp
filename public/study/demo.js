export function demoStudy() {
  const topics = [
    { id: 'learn', title: 'Learning methods', subtopics: [
      { id: 'recall', title: 'Active recall', content: 'Try to retrieve an idea from memory before looking at the answer. Checking your answer afterward reveals gaps and gives you a chance to correct them.', source: 'Sample study guide · Learning strategies' },
      { id: 'spacing', title: 'Spaced practice', content: 'Spread practice over several sessions. Returning to an idea after a delay makes you retrieve it again and helps you notice what still needs work.', source: 'Sample study guide · Learning strategies' }
    ] },
    { id: 'reflect', title: 'Practice and feedback', subtopics: [
      { id: 'feedback', title: 'Useful feedback', content: 'Useful feedback identifies the error, explains why it happened, and gives a concrete next step. A score alone tells you less about how to improve.', source: 'Sample study guide · Review and reflect' }
    ] }
  ];
  for (const topic of topics) for (const sub of topic.subtopics) {
    sub.section = topic.id === 'learn' ? 'Study methods' : 'Self-assessment';
    sub.outline = [{ text: sub.title, children: [{ text: sub.content, children: [] }] }];
  }
  const data = [
    ['recall', 'multiple-choice', 'Which study activity is an example of active recall?', ['Rereading the same paragraph', 'Highlighting every definition', 'Closing your notes and explaining the idea', 'Copying a worked solution'], 'Closing your notes and explaining the idea', 'Retrieving an idea before checking your notes is active recall.'],
    ['spacing', 'written', 'You have three 20-minute study sessions available before a quiz. How could you arrange them to use spaced practice?', [], 'Spread them over different days or separated sessions, revisiting the material after a delay.', 'Separate your sessions with time between them instead of doing all three back to back.'],
    ['feedback', 'multiple-choice', 'Which piece of feedback gives the clearest next step?', ['Incorrect.', 'Try harder next time.', 'You skipped the definition; state it first, then apply it to the example.', 'Your score is 60%.'], 'You skipped the definition; state it first, then apply it to the example.', 'This feedback names the issue and gives a specific action to improve.'],
    ['recall', 'written', 'Why is checking your answer after trying to recall an idea useful?', [], 'It reveals gaps or mistakes so you can correct them.', 'A recall attempt makes your understanding visible; feedback helps you correct any missing or mistaken parts.'],
    ['spacing', 'multiple-choice', 'Which schedule best illustrates spaced practice?', ['An hour of practice the night before', 'Twenty minutes on Monday, Wednesday, and Friday', 'Reading the chapter three times in a row', 'One long session without breaks'], 'Twenty minutes on Monday, Wednesday, and Friday', 'The practice is spread over separate days, giving you repeated retrieval opportunities.'],
    ['feedback', 'written', 'Name two things useful feedback should include beyond a score.', [], 'An explanation of the error and a concrete next step.', 'Useful feedback explains what went wrong and gives a specific action for improvement.']
  ];
  return { version: 1, title: 'Learning strategies', summary: 'Sample study session.', topics, demo: true, attempts: [], drafts: {}, files: ['Sample study guide'], questions: data.map((q, i) => ({ id: `demo-${i}`, subtopicId: q[0], kind: q[1], prompt: q[2], options: q[3], demoAnswer: q[4], demoExplanation: q[5], source: 'Sample study guide', origin: i % 2 ? 'generated' : 'uploaded' })) };
}
