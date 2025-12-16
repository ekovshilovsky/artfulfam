import {MetaFunction} from 'react-router';
import {data} from 'react-router';
import {Link, useLoaderData} from 'react-router';
import {getAllArtists, calculateAge, type Artist} from '~/data/artists';

export const meta: MetaFunction = () => {
  return [{title: 'Our Artists | ArtfulFam'}];
};

export async function loader() {
  const artists = getAllArtists();
  return data({artists});
}

export default function Artists() {
  const {artists} = useLoaderData<typeof loader>();

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <div className="max-w-4xl mx-auto text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold mb-4 font-display">
          Meet Our Artists
        </h1>
        <p className="text-lg text-muted-foreground leading-relaxed">
          Get to know the creative minds behind the artwork. Each artist brings their unique style and passion to every piece.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
        {artists.map((artist) => (
          <ArtistCard key={artist.id} artist={artist} />
        ))}
      </div>
    </div>
  );
}

function ArtistCard({artist}: {artist: Artist}) {
  const age = calculateAge(artist.birthday);

  return (
    <Link
      to={`/artists/${artist.id}`}
      className="group block border-2 border-border rounded-lg overflow-hidden hover:border-primary transition-colors"
    >
      <div className="aspect-square bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center">
        <div className="text-6xl font-bold font-display text-primary/20">
          {artist.name[0]}
        </div>
      </div>
      
      <div className="p-6">
        <h2 className="text-2xl font-bold mb-1 font-display group-hover:text-primary transition-colors">
          {artist.name}
        </h2>
        <p className="text-sm text-muted-foreground mb-3">
          {artist.role === 'student' ? `Age ${age}` : 'Teacher & Artist'}
        </p>
        
        <div className="flex flex-wrap gap-2 mb-3">
          {artist.styles.slice(0, 2).map((style) => (
            <span
              key={style}
              className="inline-flex items-center rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary"
            >
              {style}
            </span>
          ))}
        </div>
        
        <p className="text-sm text-muted-foreground">
          {artist.shortBio}
        </p>
      </div>
    </Link>
  );
}
