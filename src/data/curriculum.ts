
export interface LearningOutcome {
  id: string
  code: string
  description: string
}

export interface ChemistryTopic {
  id: string
  title: string
  outcomes: LearningOutcome[]
}

export interface ChemistryTheme {
  id: string
  title: string
  topics: ChemistryTopic[]
}

export interface GradeCurriculum {
  grade: 9 | 10 | 11 | 12
  themes: ChemistryTheme[]
}

export const curriculum: GradeCurriculum[] = [
  { grade: 9, themes: [] },
  { grade: 10, themes: [] },
  { grade: 11, themes: [] },
  { grade: 12, themes: [] },
]
