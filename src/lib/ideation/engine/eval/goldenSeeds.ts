export interface GoldenSeed {
  id: string;
  seedText: string;
  notes?: string;
}

export const GOLDEN_SEEDS: GoldenSeed[] = [
  { id: 'gs-001', seedText: 'A tool that helps people brainstorm better by structuring their creative process', notes: 'productivity + creativity cross' },
  { id: 'gs-002', seedText: 'A game that teaches systems thinking through city simulation', notes: 'education + simulation' },
  { id: 'gs-003', seedText: 'A platform where artists collaborate by adding constraints to each other\'s work', notes: 'art + collaboration' },
  { id: 'gs-004', seedText: 'An app that turns your daily commute into a language-learning game', notes: 'education + gamification' },
  { id: 'gs-005', seedText: 'A music production tool where you can only use sounds from your neighborhood', notes: 'constraint-art + audio' },
  { id: 'gs-006', seedText: 'A social network where every post must be exactly 60 seconds of audio', notes: 'sensory constraint' },
  { id: 'gs-007', seedText: 'A fitness app that designs workouts based on what furniture you have at home', notes: 'practical constraint' },
  { id: 'gs-008', seedText: 'A project management tool that intentionally introduces chaos to prevent groupthink', notes: 'inversion + chaos' },
  { id: 'gs-009', seedText: 'A cooking app where recipes adapt based on what\'s about to expire in your fridge', notes: 'waste reduction + practical' },
  { id: 'gs-010', seedText: 'A mentorship marketplace where the youngest employees teach the oldest executives', notes: 'inversion + mentorship' },
  { id: 'gs-011', seedText: 'A writing tool that forces you to explain your idea in haiku before you can write prose', notes: 'constraint-art + brevity' },
  { id: 'gs-012', seedText: 'A budgeting app where you can only see your spending as a visual landscape', notes: 'visual constraint + finance' },
  { id: 'gs-013', seedText: 'A debate platform where you must argue for the opposite of your actual position', notes: 'inversion + empathy' },
  { id: 'gs-014', seedText: 'A hiring tool that removes all credentials and focuses only on demonstrated work', notes: 'inversion + meritocracy' },
  { id: 'gs-015', seedText: 'An event planner that optimizes for serendipitous encounters between strangers', notes: 'social + emergence' },
];
