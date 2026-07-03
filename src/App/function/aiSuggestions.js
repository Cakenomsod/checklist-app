const TEMPLATES = {
  Travel: ['Book flights', 'Reserve accommodation', 'Get travel insurance', 'Check passport/visa', 'Plan daily itinerary', 'Pack essentials'],
  Shopping: ['Make shopping list', 'Compare prices', 'Set budget', 'Check store hours', 'Bring reusable bags', 'Review receipts'],
  Education: ['Review syllabus', 'Complete assignments', 'Prepare study notes', 'Schedule study sessions', 'Submit work on time', 'Ask for feedback'],
  Work: ['Define deliverables', 'Set priorities', 'Schedule meetings', 'Follow up with team', 'Review progress', 'Document outcomes'],
  Health: ['Schedule appointment', 'Track meals/water', 'Plan workout', 'Take medication', 'Log sleep', 'Review health goals'],
  Personal: ['Set a goal', 'Block focus time', 'Organize space', 'Reach out to someone', 'Review weekly plan', 'Celebrate a win'],
  Events: ['Send invitations', 'Confirm venue', 'Plan menu/activities', 'Prepare materials', 'Create timeline', 'Day-of checklist'],
  Other: ['Research options', 'Set a deadline', 'Create a budget', 'Assign responsibilities', 'Review progress', 'Finalize and submit'],
};

const KEYWORDS = [
  { match: /trip|travel|flight|hotel|vacation|japan|✈|🗾|🏖/i, key: 'Travel' },
  { match: /shop|grocery|buy|market|🛒/i, key: 'Shopping' },
  { match: /study|school|exam|homework|📚|class|learn/i, key: 'Education' },
  { match: /work|office|project|meeting|job|💼/i, key: 'Work' },
  { match: /health|gym|doctor|fitness|💪|med/i, key: 'Health' },
  { match: /party|event|birthday|wedding|🎉|meetup/i, key: 'Events' },
];

export function getSuggestionsForList(listName = '', category = 'Other') {
  const byCategory = TEMPLATES[category] || TEMPLATES.Other;
  const keywordMatch = KEYWORDS.find(({ match }) => match.test(listName));
  if (keywordMatch && keywordMatch.key !== category) {
    return TEMPLATES[keywordMatch.key] || byCategory;
  }
  return byCategory;
}
