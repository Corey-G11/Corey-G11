export interface TemplateDay {
  dayNumber: number;
  name: string;
  focus: string;
  exercises: string[];
}

export interface ProgramTemplate {
  id: string;
  name: string;
  description: string;
  durationWeeks: number;
  daysPerWeek: number;
  days: TemplateDay[];
}

export interface AdoptedProgram {
  id: string;
  name: string;
  durationWeeks: number;
  isActive: boolean;
  scheduledWorkouts: { id: string; dayNumber: number; name: string }[];
}
