import { topics } from '../data/threads';

export function getTopicBySlug(slug) {
  return topics.find((topic) => topic.slug === slug) || null;
}

export function getStatusTone(status) {
  if (status === 'solved') return 'bg-neon text-ink';
  if (status === 'in_progress') return 'bg-amber text-ink';
  return 'bg-action text-white';
}







