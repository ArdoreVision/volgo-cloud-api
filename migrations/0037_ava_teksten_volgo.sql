-- Every remaining "AVA" text in stored chat settings becomes "Volgo" (e.g. the invitation "Ask AVA.").
UPDATE ava_stijl SET uitnodiging = REPLACE(uitnodiging, 'AVA', 'Volgo') WHERE uitnodiging LIKE '%AVA%';
UPDATE ava_instellingen SET naam = REPLACE(naam, 'AVA', 'Volgo') WHERE naam LIKE '%AVA%';
UPDATE ava_instellingen SET begroeting = REPLACE(begroeting, 'AVA', 'Volgo') WHERE begroeting LIKE '%AVA%';
UPDATE ava_instellingen SET bedrijfsinfo = REPLACE(bedrijfsinfo, 'AVA', 'Volgo') WHERE bedrijfsinfo LIKE '%AVA%';
