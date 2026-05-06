export const DEPARTMENTS: { name: string; programIds: string[] }[] = [
  { name: 'African-American Studies', programIds: ['african_american_studies_major'] },
  { name: 'American Studies', programIds: ['american_studies_major'] },
  { name: 'Anthropology', programIds: ['anthropology_major'] },
  { name: 'Art', programIds: ['studio_art_major', 'art_history_major'] },
  { name: 'Biology', programIds: ['biology_major', 'computational_biology_major'] },
  { name: 'Chemistry', programIds: ['chemistry_major', 'chemistry_biochemistry_major', 'chemistry_cell_molecular_major', 'chemistry_environmental_science_conc'] },
  { name: 'Cinema Studies', programIds: ['cinema_studies_minor'] },
  { name: 'Classics', programIds: ['classics_major', 'classical_civilization_major', 'classics_english_major', 'classical_civ_english_major', 'classical_civ_anthropology_major'] },
  { name: 'Computer Science', programIds: ['computer_science_major'] },
  { name: 'Creative Writing', programIds: ['creative_writing_minor'] },
  { name: 'Earth Sciences', programIds: ['earth_sciences_major'] },
  { name: 'East Asian Studies', programIds: ['east_asian_studies_major'] },
  { name: 'Economics', programIds: ['economics_major'] },
  { name: 'Education', programIds: ['educational_studies_major'] },
  { name: 'English', programIds: ['english_major'] },
  { name: 'Environmental Studies', programIds: ['environmental_policy_major', 'environmental_science_major', 'environmental_computation_major'] },
  { name: 'French and Italian', programIds: ['french_studies_major'] },
  { name: 'German and Russian', programIds: ['german_studies_major', 'russian_language_and_culture_major'] },
  { name: 'Global Studies', programIds: ['global_studies_major_2028', 'global_studies_major_2026_2027'] },
  { name: 'Government', programIds: ['government_major'] },
  { name: 'History', programIds: ['history_major'] },
  { name: 'Independent Major', programIds: [] },
  { name: 'Integrated Studies', programIds: ['integrated_studies'] },
  { name: 'Jewish Studies', programIds: ['jewish_studies_major'] },
  { name: 'Latin American Studies', programIds: ['latin_american_studies_major'] },
  { name: 'Mathematics', programIds: ['mathematics_major', 'mathematical_sciences_major'] },
  { name: 'Music', programIds: ['music_major'] },
  { name: 'Performance, Theater, and Dance', programIds: ['performance_theater_dance_major'] },
  { name: 'Philosophy', programIds: ['philosophy_major'] },
  { name: 'Physics and Astronomy', programIds: ['physics_major', 'astronomy_minor'] },
  { name: 'Psychology', programIds: ['psychology_major'] },
  { name: 'Religious Studies', programIds: ['religious_studies_major'] },
  { name: 'Science, Technology, and Society', programIds: ['sts_major'] },
  { name: 'Sociology', programIds: ['sociology_major'] },
  { name: 'Spanish', programIds: ['spanish_major'] },
  { name: 'Statistics', programIds: ['statistics_major'] },
  { name: "Women's, Gender, and Sexuality Studies", programIds: ['wgss_major'] },
];

export function getProgramDepartment(programId: string): string | null {
  for (const dept of DEPARTMENTS) {
    if (dept.programIds.includes(programId)) return dept.name;
  }
  return null;
}
