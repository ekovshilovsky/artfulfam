import {MetaFunction} from 'react-router';
import {data, redirect} from 'react-router';
import type {LoaderFunctionArgs} from '@shopify/hydrogen/oxygen';
import {Link, useLoaderData} from 'react-router';
import {getArtist, getTeacher, getStudents, calculateAge, type Artist} from '~/data/artists';

export const meta: MetaFunction<typeof loader> = ({data}) => {
  return [{title: `${data?.artist?.name} | Artists | ArtfulFam`}];
};

export async function loader({params}: LoaderFunctionArgs) {
  const {id} = params;
  
  if (!id) {
    throw new Response('Not found', {status: 404});
  }
  
  const artist = getArtist(id);
  
  if (!artist) {
    throw new Response('Artist not found', {status: 404});
  }
  
  const teacher = artist.teacherId ? getTeacher(artist.teacherId) : null;
  const students = artist.studentIds ? getStudents(artist.studentIds) : [];
  
  return data({artist, teacher, students});
}

export default function ArtistPage() {
  const {artist, teacher, students} = useLoaderData<typeof loader>();
  const age = calculateAge(artist.birthday);

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <div className="max-w-4xl mx-auto">
        {/* Back link */}
        <Link
          to="/artists"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Artists
        </Link>

        {/* Artist Header */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          <div className="md:col-span-1">
            <div className="aspect-square bg-gradient-to-br from-primary/20 to-accent/20 rounded-lg flex items-center justify-center border-2 border-border">
              <div className="text-9xl font-bold font-display text-primary/30">
                {artist.name[0]}
              </div>
            </div>
          </div>
          
          <div className="md:col-span-2">
            <h1 className="text-4xl md:text-5xl font-bold mb-2 font-display">
              {artist.name}
            </h1>
            <p className="text-xl text-muted-foreground mb-6">
              {artist.role === 'student' ? `Age ${age} • Young Artist` : 'Teacher & Artist'}
            </p>
            
            {/* Mediums */}
            <div className="mb-4">
              <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">
                Mediums
              </h3>
              <div className="flex flex-wrap gap-2">
                {artist.mediums.map((medium) => (
                  <span
                    key={medium}
                    className="inline-flex items-center rounded-md bg-secondary px-3 py-1 text-sm font-medium text-secondary-foreground"
                  >
                    {medium}
                  </span>
                ))}
              </div>
            </div>
            
            {/* Styles */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">
                Art Styles
              </h3>
              <div className="flex flex-wrap gap-2">
                {artist.styles.map((style) => (
                  <span
                    key={style}
                    className="inline-flex items-center rounded-md bg-primary/10 px-3 py-1 text-sm font-medium text-primary"
                  >
                    {style}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bio Section */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-4 font-display">About the Artist</h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            {artist.bio}
          </p>
        </div>

        {/* Teacher Section (for students) */}
        {teacher && (
          <div className="border-t border-border pt-8 mb-12">
            <h2 className="text-2xl font-bold mb-4 font-display">Teacher</h2>
            <Link
              to={`/artists/${teacher.id}`}
              className="group flex items-center gap-4 p-4 border-2 border-border rounded-lg hover:border-primary transition-colors"
            >
              <div className="w-16 h-16 bg-gradient-to-br from-primary/10 to-accent/10 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-2xl font-bold font-display text-primary/50">
                  {teacher.name[0]}
                </span>
              </div>
              <div>
                <h3 className="text-lg font-bold group-hover:text-primary transition-colors">
                  {teacher.name}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {teacher.mediums.join(', ')}
                </p>
              </div>
            </Link>
          </div>
        )}

        {/* Students Section (for teacher) */}
        {students.length > 0 && (
          <div className="border-t border-border pt-8">
            <h2 className="text-2xl font-bold mb-4 font-display">Students</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {students.map((student) => {
                const studentAge = calculateAge(student.birthday);
                return (
                  <Link
                    key={student.id}
                    to={`/artists/${student.id}`}
                    className="group flex items-center gap-4 p-4 border-2 border-border rounded-lg hover:border-primary transition-colors"
                  >
                    <div className="w-16 h-16 bg-gradient-to-br from-primary/10 to-accent/10 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-2xl font-bold font-display text-primary/50">
                        {student.name[0]}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold group-hover:text-primary transition-colors">
                        {student.name}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Age {studentAge} • {student.styles.join(', ')}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
