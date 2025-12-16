export type Artist = {
  id: string;
  name: string;
  birthday: string; // Format: YYYY-MM-DD
  role: 'student' | 'teacher';
  shortBio: string; // ~120 characters for cards
  bio: string; // Full bio for detail page
  mediums: string[];
  styles: string[];
  teacherId?: string; // For students
  studentIds?: string[]; // For teachers
  image?: string;
};

export const artists: Record<string, Artist> = {
  bella: {
    id: 'bella',
    name: 'Bella',
    birthday: '2012-02-01',
    role: 'student',
    shortBio: 'A creative young artist who loves bringing her imagination to life through vibrant colors and playful designs.',
    bio: 'Bella is a creative young artist who loves bringing her imagination to life through vibrant colors and playful designs. Her artwork reflects a unique perspective that captures the wonder of childhood, transforming everyday moments into extraordinary visual stories.',
    mediums: ['Digital', 'Watercolor', 'Marker'],
    styles: ['Abstract', 'Cartoon', 'Fantasy'],
    teacherId: 'galina',
  },
  maksim: {
    id: 'maksim',
    name: 'Maksim',
    birthday: '2010-09-01',
    role: 'student',
    shortBio: 'An enthusiastic artist with a keen eye for detail and a passion for experimenting with different artistic techniques.',
    bio: 'Maksim is an enthusiastic artist with a keen eye for detail and a passion for experimenting with different artistic techniques. His bold approach to art demonstrates creativity beyond his years, combining traditional methods with modern expression.',
    mediums: ['Acrylic', 'Pencil', 'Digital'],
    styles: ['Cartoon', 'Realism', 'Pop Art'],
    teacherId: 'galina',
  },
  galina: {
    id: 'galina',
    name: 'Galina',
    birthday: '1980-05-15',
    role: 'teacher',
    shortBio: 'An accomplished artist and dedicated art educator who inspires young minds to explore their creativity.',
    bio: 'Galina is an accomplished artist and dedicated art educator who inspires young minds to explore their creativity. With years of experience in various artistic mediums, she guides her students in discovering their unique artistic voices while developing their technical skills and creative confidence.',
    mediums: ['Oil Paint', 'Acrylic', 'Mixed Media', 'Digital'],
    styles: ['Contemporary', 'Abstract', 'Impressionism'],
    studentIds: ['bella', 'maksim'],
  },
};

export function getArtist(id: string): Artist | undefined {
  return artists[id];
}

export function getTeacher(teacherId: string): Artist | undefined {
  return artists[teacherId];
}

export function getStudents(studentIds: string[]): Artist[] {
  return studentIds.map(id => artists[id]).filter(Boolean);
}

export function calculateAge(birthday: string): number {
  const birthDate = new Date(birthday);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
}

export function getAllArtists(): Artist[] {
  return Object.values(artists);
}
