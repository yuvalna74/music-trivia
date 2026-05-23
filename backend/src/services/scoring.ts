export const SONG_POINTS = 5;
export const ARTIST_POINTS = 10;

export type RoundScore = {
  songCorrect: boolean;
  artistCorrect: boolean;
  pointsAwarded: number;
};

export function calculateRoundScore(songCorrect: boolean, artistCorrect: boolean): RoundScore {
  const pointsAwarded = (songCorrect ? SONG_POINTS : 0) + (artistCorrect ? ARTIST_POINTS : 0);
  return { songCorrect, artistCorrect, pointsAwarded };
}
