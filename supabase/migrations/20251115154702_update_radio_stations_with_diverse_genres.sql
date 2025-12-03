/*
  # Update Radio Stations with Diverse Genres and Real Streams

  1. Changes
    - Delete all existing stations including InfinityPlay Talk
    - Add 20+ new stations with diverse genres
    - Update bitrate to 320kbps for all stations
    - Remove InfinityPlay prefix from all station names
    - Add unique genres with descriptive content
    - Include 2 functional test stations with real stream URLs
  
  2. New Stations
    - Pop Hits, Rock Legends, Jazz Lounge, Electronic Vibes, Chill Out
    - Hip-Hop Beats, Country Roads, Classical Moments, Reggae Vibes, Blues Soul
    - Latin Rhythms, Metal Fury, Indie Waves, Folk Tales, Ambient Dreams
    - Dance Party, Oldies Gold, R&B Smooth, Funk Groove, World Music
    - Acoustic Sessions, Lounge Cafe
  
  3. Real Streams
    - Jazz Lounge: Radio Swiss Jazz (http://stream.srg-ssr.ch/m/rsj/mp3_128)
    - Electronic Vibes: SomaFM Groove Salad (https://ice1.somafm.com/groovesalad-128-mp3)
*/

DELETE FROM radio_stations;

INSERT INTO radio_stations (name, description, genre, stream_url, bitrate, is_featured, is_active, listener_count) VALUES
  ('Pop Hits', 'Najnoviji pop hitovi i klasici', 'Pop', 'https://stream.example.com/pop', 320, true, true, 0),
  ('Rock Legends', 'Rock legende i savremeni alternative', 'Rock', 'https://stream.example.com/rock', 320, true, true, 0),
  ('Jazz Lounge', 'Smooth jazz za opuštenu atmosferu', 'Jazz', 'http://stream.srg-ssr.ch/m/rsj/mp3_128', 320, true, true, 0),
  ('Electronic Vibes', 'Elektronska muzika za energiju', 'Electronic', 'https://ice1.somafm.com/groovesalad-128-mp3', 320, true, true, 0),
  ('Chill Out', 'Opuštajuće melodije za relaksaciju', 'Chill', 'https://stream.example.com/chill', 320, false, true, 0),
  ('Hip-Hop Beats', 'Najbolji hip-hop hitovi i underground scena', 'Hip-Hop', 'https://stream.example.com/hiphop', 320, false, true, 0),
  ('Country Roads', 'Moderna i klasična country muzika', 'Country', 'https://stream.example.com/country', 320, false, true, 0),
  ('Classical Moments', 'Timeless klasična muzika majstora', 'Classical', 'https://stream.example.com/classical', 320, true, true, 0),
  ('Reggae Vibes', 'Pozitivne reggae vibracije', 'Reggae', 'https://stream.example.com/reggae', 320, false, true, 0),
  ('Blues Soul', 'Autentični blues i soul zvuci', 'Blues', 'https://stream.example.com/blues', 320, false, true, 0),
  ('Latin Rhythms', 'Vatreni latino ritmovi', 'Latin', 'https://stream.example.com/latin', 320, false, true, 0),
  ('Metal Fury', 'Najbolji heavy metal i hard rock', 'Metal', 'https://stream.example.com/metal', 320, false, true, 0),
  ('Indie Waves', 'Alternativni i indie zvuci', 'Indie', 'https://stream.example.com/indie', 320, false, true, 0),
  ('Folk Tales', 'Tradicionalni i savremeni folk', 'Folk', 'https://stream.example.com/folk', 320, false, true, 0),
  ('Ambient Dreams', 'Atmosferični ambient i elektronika', 'Ambient', 'https://stream.example.com/ambient', 320, false, true, 0),
  ('Dance Party', 'Najbolje dance i house hitove', 'Dance', 'https://stream.example.com/dance', 320, false, true, 0),
  ('Oldies Gold', 'Zlatne melodije iz prošlosti', 'Oldies', 'https://stream.example.com/oldies', 320, false, true, 0),
  ('R&B Smooth', 'Smooth R&B za svaku priliku', 'R&B', 'https://stream.example.com/rnb', 320, false, true, 0),
  ('Funk Groove', 'Funky ritmovi koji pokreću', 'Funk', 'https://stream.example.com/funk', 320, false, true, 0),
  ('World Music', 'Muzika iz svih krajeva sveta', 'World', 'https://stream.example.com/world', 320, false, true, 0),
  ('Acoustic Sessions', 'Intimne akustične izvedbe', 'Acoustic', 'https://stream.example.com/acoustic', 320, false, true, 0),
  ('Lounge Cafe', 'Sofisticirana muzika za kafee', 'Lounge', 'https://stream.example.com/lounge', 320, false, true, 0);
