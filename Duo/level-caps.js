const LEVEL_CAPS = {
  'rot-blau': { label: 'Rot / Blau', labelEn: 'Red / Blue', entries: [
    { name: 'Rocko', type: 'rock', cap: 14, team: [{id:74,level:12},{id:95,level:14}] },
    { name: 'Misty', type: 'water', cap: 21, team: [{id:120,level:18},{id:121,level:21}] },
    { name: 'Surge', type: 'electric', cap: 24, team: [{id:100,level:21},{id:25,level:18},{id:26,level:24}] },
    { name: 'Erika', type: 'grass', cap: 29, team: [{id:71,level:29},{id:114,level:24},{id:45,level:29}] },
    { name: 'Koga', type: 'poison', cap: 43, team: [{id:109,level:37},{id:89,level:39},{id:109,level:37},{id:110,level:43}] },
    { name: 'Sabrina', type: 'psychic', cap: 43, team: [{id:64,level:38},{id:122,level:37},{id:49,level:38},{id:65,level:43}] },
    { name: 'Pyro', type: 'fire', cap: 47, team: [{id:58,level:42},{id:77,level:40},{id:78,level:42},{id:59,level:47}] },
    { name: 'Giovanni', type: 'ground', cap: 50, team: [{id:111,level:45},{id:51,level:42},{id:31,level:44},{id:34,level:45},{id:112,level:50}] },
    { name: 'Lorelei', cap: 56, isE4: true, team: [{id:87,level:54},{id:91,level:54},{id:80,level:54},{id:124,level:56},{id:131,level:56}] },
    { name: 'Bruno', cap: 58, isE4: true, team: [{id:95,level:53},{id:107,level:55},{id:106,level:55},{id:95,level:56},{id:68,level:58}] },
    { name: 'Agathe', cap: 60, isE4: true, team: [{id:94,level:54},{id:93,level:56},{id:94,level:58},{id:24,level:58},{id:94,level:60}] },
    { name: 'Siegfried', cap: 62, isE4: true, team: [{id:130,level:56},{id:148,level:58},{id:148,level:58},{id:142,level:60},{id:149,level:62}] },
    { name: 'Champion Blau', cap: 65, isE4: true, variant: true, team: [{id:18,level:59},{id:65,level:57},{id:112,level:59},{id:59,level:59},{id:103,level:61},{id:6,level:65}] },
  ]},
  'gelb': { label: 'Gelb', labelEn: 'Yellow', entries: [
    { name: 'Rocko', type: 'rock', cap: 12, team: [{id:74,level:10},{id:95,level:12}] },
    { name: 'Misty', type: 'water', cap: 21, team: [{id:120,level:18},{id:121,level:21}] },
    { name: 'Surge', type: 'electric', cap: 28, team: [{id:26,level:28}] },
    { name: 'Erika', type: 'grass', cap: 32, team: [{id:114,level:30},{id:70,level:32},{id:44,level:32}] },
    { name: 'Koga', type: 'poison', cap: 50, team: [{id:48,level:44},{id:48,level:46},{id:109,level:48},{id:89,level:50}] },
    { name: 'Sabrina', type: 'psychic', cap: 50, team: [{id:122,level:50},{id:124,level:50},{id:65,level:50}] },
    { name: 'Pyro', type: 'fire', cap: 54, team: [{id:38,level:48},{id:59,level:50},{id:136,level:54}] },
    { name: 'Giovanni', type: 'ground', cap: 55, team: [{id:111,level:50},{id:51,level:53},{id:112,level:55},{id:31,level:55},{id:34,level:55}] },
    { name: 'Lorelei', cap: 56, isE4: true, team: [{id:87,level:54},{id:91,level:54},{id:80,level:54},{id:124,level:56},{id:131,level:56}] },
    { name: 'Bruno', cap: 58, isE4: true, team: [{id:95,level:53},{id:107,level:55},{id:106,level:55},{id:95,level:56},{id:68,level:58}] },
    { name: 'Agathe', cap: 60, isE4: true, team: [{id:94,level:54},{id:93,level:56},{id:94,level:58},{id:24,level:58},{id:94,level:60}] },
    { name: 'Siegfried', cap: 62, isE4: true, team: [{id:130,level:56},{id:148,level:58},{id:148,level:58},{id:142,level:60},{id:149,level:62}] },
    { name: 'Champion Blau', cap: 65, isE4: true, variant: true, team: [{id:28,level:61},{id:65,level:59},{id:103,level:61},{id:91,level:61},{id:38,level:63},{id:135,level:65}] },
  ]},
  'gold-silber': { label: 'Gold / Silber', labelEn: 'Gold / Silver', entries: [
    { name: 'Falkner', type: 'flying', cap: 9, team: [{id:16,level:7},{id:17,level:9}] },
    { name: 'Ahornia', type: 'bug', cap: 16, team: [{id:11,level:14},{id:14,level:14},{id:123,level:16}] },
    { name: 'Whitney', type: 'normal', cap: 20, team: [{id:35,level:18},{id:241,level:20}] },
    { name: 'Morty', type: 'ghost', cap: 25, team: [{id:92,level:21},{id:93,level:21},{id:93,level:23},{id:94,level:25}] },
    { name: 'Chuck', type: 'fighting', cap: 30, team: [{id:57,level:27},{id:62,level:30}] },
    { name: 'Jasmine', type: 'steel', cap: 35, team: [{id:81,level:30},{id:81,level:30},{id:208,level:35}] },
    { name: 'Pryce', type: 'ice', cap: 31, team: [{id:86,level:27},{id:87,level:29},{id:221,level:31}] },
    { name: 'Clair', type: 'dragon', cap: 40, team: [{id:148,level:37},{id:148,level:37},{id:130,level:38},{id:230,level:40}] },
    { name: 'Will', cap: 42, isE4: true, team: [{id:178,level:40},{id:124,level:41},{id:103,level:41},{id:80,level:41},{id:178,level:42}] },
    { name: 'Koga', cap: 44, isE4: true, team: [{id:168,level:40},{id:49,level:41},{id:205,level:43},{id:89,level:42},{id:169,level:44}] },
    { name: 'Bruno', cap: 46, isE4: true, team: [{id:237,level:42},{id:106,level:42},{id:107,level:42},{id:95,level:43},{id:68,level:46}] },
    { name: 'Karen', cap: 47, isE4: true, team: [{id:197,level:42},{id:45,level:42},{id:198,level:44},{id:94,level:45},{id:229,level:47}] },
    { name: 'Champion Siegfried', cap: 50, isE4: true, team: [{id:130,level:44},{id:149,level:47},{id:149,level:47},{id:6,level:46},{id:142,level:46},{id:149,level:50}] },
  ]},
  'kristall': { label: 'Kristall', labelEn: 'Crystal', entries: [
    { name: 'Falkner', type: 'flying', cap: 9, team: [{id:16,level:7},{id:17,level:9}] },
    { name: 'Ahornia', type: 'bug', cap: 16, team: [{id:167,level:14},{id:11,level:14},{id:123,level:16}] },
    { name: 'Whitney', type: 'normal', cap: 20, team: [{id:35,level:18},{id:241,level:20}] },
    { name: 'Morty', type: 'ghost', cap: 25, team: [{id:92,level:21},{id:93,level:21},{id:93,level:23},{id:94,level:25}] },
    { name: 'Chuck', type: 'fighting', cap: 30, team: [{id:57,level:27},{id:62,level:30}] },
    { name: 'Jasmine', type: 'steel', cap: 35, team: [{id:81,level:30},{id:81,level:30},{id:208,level:35}] },
    { name: 'Pryce', type: 'ice', cap: 31, team: [{id:86,level:27},{id:87,level:29},{id:221,level:31}] },
    { name: 'Clair', type: 'dragon', cap: 40, team: [{id:148,level:37},{id:148,level:37},{id:130,level:38},{id:230,level:40}] },
    { name: 'Will', cap: 42, isE4: true, team: [{id:178,level:40},{id:124,level:41},{id:103,level:41},{id:80,level:41},{id:178,level:42}] },
    { name: 'Koga', cap: 44, isE4: true, team: [{id:168,level:40},{id:49,level:41},{id:205,level:43},{id:89,level:42},{id:169,level:44}] },
    { name: 'Bruno', cap: 46, isE4: true, team: [{id:237,level:42},{id:106,level:42},{id:107,level:42},{id:95,level:43},{id:68,level:46}] },
    { name: 'Karen', cap: 47, isE4: true, team: [{id:197,level:42},{id:45,level:42},{id:198,level:44},{id:94,level:45},{id:229,level:47}] },
    { name: 'Champion Siegfried', cap: 50, isE4: true, team: [{id:130,level:44},{id:149,level:47},{id:149,level:47},{id:6,level:46},{id:142,level:46},{id:149,level:50}] },
  ]},
  'rubin-saphir': { label: 'Rubin / Saphir', labelEn: 'Ruby / Sapphire', entries: [
    { name: 'Roxanne', type: 'rock', cap: 15, team: [{id:74,level:14},{id:299,level:15}] },
    { name: 'Brawly', type: 'fighting', cap: 18, team: [{id:66,level:17},{id:307,level:17},{id:296,level:18}] },
    { name: 'Wattson', type: 'electric', cap: 23, team: [{id:100,level:20},{id:81,level:20},{id:82,level:22},{id:310,level:23}] },
    { name: 'Flannery', type: 'fire', cap: 28, team: [{id:322,level:24},{id:218,level:26},{id:218,level:26},{id:324,level:28}] },
    { name: 'Norman', type: 'normal', cap: 31, team: [{id:327,level:27},{id:288,level:27},{id:264,level:29},{id:289,level:31}] },
    { name: 'Winona', type: 'flying', cap: 33, team: [{id:333,level:29},{id:357,level:29},{id:279,level:30},{id:227,level:31},{id:334,level:33}] },
    { name: 'Tate & Liza', type: 'psychic', cap: 42, team: [{id:337,level:42},{id:338,level:42}] },
    { name: 'Wallace', type: 'water', cap: 43, team: [{id:370,level:40},{id:364,level:40},{id:119,level:42},{id:340,level:42},{id:350,level:43}] },
    { name: 'Sidney', cap: 49, isE4: true, team: [{id:262,level:46},{id:332,level:46},{id:275,level:48},{id:319,level:48},{id:359,level:49}] },
    { name: 'Phoebe', cap: 51, isE4: true, team: [{id:356,level:48},{id:354,level:49},{id:302,level:50},{id:354,level:49},{id:356,level:51}] },
    { name: 'Glacia', cap: 53, isE4: true, team: [{id:364,level:50},{id:364,level:50},{id:362,level:52},{id:362,level:52},{id:365,level:53}] },
    { name: 'Drake', cap: 55, isE4: true, team: [{id:372,level:52},{id:334,level:54},{id:330,level:53},{id:330,level:53},{id:373,level:55}] },
    { name: 'Champion Steven', cap: 58, isE4: true, team: [{id:227,level:57},{id:344,level:55},{id:306,level:56},{id:346,level:56},{id:348,level:56},{id:376,level:58}] },
  ]},
  'smaragd': { label: 'Smaragd', labelEn: 'Emerald', entries: [
    { name: 'Roxanne', type: 'rock', cap: 15, team: [{id:74,level:14},{id:299,level:15}] },
    { name: 'Brawly', type: 'fighting', cap: 19, team: [{id:66,level:17},{id:307,level:17},{id:296,level:19}] },
    { name: 'Wattson', type: 'electric', cap: 24, team: [{id:100,level:20},{id:81,level:20},{id:82,level:22},{id:310,level:24}] },
    { name: 'Flannery', type: 'fire', cap: 29, team: [{id:322,level:24},{id:218,level:24},{id:218,level:26},{id:324,level:29}] },
    { name: 'Norman', type: 'normal', cap: 31, team: [{id:327,level:27},{id:264,level:27},{id:288,level:29},{id:289,level:31}] },
    { name: 'Winona', type: 'flying', cap: 33, team: [{id:333,level:29},{id:357,level:29},{id:279,level:30},{id:227,level:31},{id:334,level:33}] },
    { name: 'Tate & Liza', type: 'psychic', cap: 42, team: [{id:344,level:41},{id:178,level:41},{id:337,level:42},{id:338,level:42}] },
    { name: 'Juan', type: 'water', cap: 46, team: [{id:370,level:41},{id:340,level:41},{id:364,level:43},{id:342,level:43},{id:230,level:46}] },
    { name: 'Sidney', cap: 49, isE4: true, team: [{id:262,level:46},{id:332,level:46},{id:275,level:48},{id:319,level:48},{id:359,level:49}] },
    { name: 'Phoebe', cap: 51, isE4: true, team: [{id:356,level:48},{id:354,level:49},{id:302,level:50},{id:354,level:49},{id:356,level:51}] },
    { name: 'Glacia', cap: 53, isE4: true, team: [{id:364,level:50},{id:364,level:50},{id:362,level:52},{id:362,level:52},{id:365,level:53}] },
    { name: 'Drake', cap: 55, isE4: true, team: [{id:372,level:52},{id:334,level:54},{id:330,level:53},{id:330,level:53},{id:373,level:55}] },
    { name: 'Champion Wallace', cap: 58, isE4: true, team: [{id:321,level:57},{id:73,level:55},{id:272,level:56},{id:340,level:56},{id:130,level:56},{id:350,level:58}] },
  ]},
  'feuerrot-blattgruen': { label: 'Feuerrot / Blattgrün', labelEn: 'FireRed / LeafGreen', entries: [
    { name: 'Rocko', type: 'rock', cap: 14, team: [{id:74,level:12},{id:95,level:14}] },
    { name: 'Misty', type: 'water', cap: 21, team: [{id:120,level:18},{id:121,level:21}] },
    { name: 'Surge', type: 'electric', cap: 24, team: [{id:100,level:21},{id:25,level:18},{id:26,level:24}] },
    { name: 'Erika', type: 'grass', cap: 29, team: [{id:114,level:24},{id:44,level:29},{id:71,level:29}] },
    { name: 'Koga', type: 'poison', cap: 43, team: [{id:109,level:37},{id:89,level:39},{id:109,level:37},{id:110,level:43}] },
    { name: 'Sabrina', type: 'psychic', cap: 43, team: [{id:122,level:38},{id:124,level:38},{id:65,level:43}] },
    { name: 'Pyro', type: 'fire', cap: 47, team: [{id:77,level:40},{id:58,level:42},{id:78,level:42},{id:59,level:47}] },
    { name: 'Giovanni', type: 'ground', cap: 50, team: [{id:51,level:50},{id:31,level:45},{id:53,level:40},{id:34,level:45},{id:112,level:50}] },
    { name: 'Lorelei', cap: 54, isE4: true, team: [{id:87,level:54},{id:91,level:51},{id:80,level:52},{id:124,level:54},{id:131,level:54}] },
    { name: 'Bruno', cap: 56, isE4: true, team: [{id:95,level:53},{id:107,level:55},{id:106,level:55},{id:95,level:54},{id:68,level:56}] },
    { name: 'Agathe', cap: 58, isE4: true, team: [{id:94,level:54},{id:93,level:53},{id:94,level:56},{id:24,level:58},{id:94,level:58}] },
    { name: 'Siegfried', cap: 60, isE4: true, team: [{id:117,level:56},{id:130,level:58},{id:142,level:60},{id:149,level:60},{id:149,level:60}] },
    { name: 'Champion Blau', cap: 63, isE4: true, variant: true, team: [{id:18,level:59},{id:65,level:57},{id:112,level:59},{id:103,level:59},{id:130,level:61},{id:6,level:63}] },
  ]},
  'diamant-perl': { label: 'Diamant / Perl', labelEn: 'Diamond / Pearl', entries: [
    { name: 'Roark', type: 'rock', cap: 14, team: [{id:74,level:12},{id:95,level:12},{id:408,level:14}] },
    { name: 'Gardenia', type: 'grass', cap: 22, team: [{id:420,level:19},{id:387,level:19},{id:407,level:22}] },
    { name: 'Maylene', type: 'fighting', cap: 30, team: [{id:307,level:28},{id:67,level:27},{id:448,level:30}] },
    { name: 'Crasher Wake', type: 'water', cap: 30, team: [{id:130,level:27},{id:195,level:27},{id:419,level:30}] },
    { name: 'Fantina', type: 'ghost', cap: 36, team: [{id:426,level:32},{id:94,level:34},{id:429,level:36}] },
    { name: 'Byron', type: 'steel', cap: 39, team: [{id:436,level:36},{id:208,level:36},{id:411,level:39}] },
    { name: 'Candice', type: 'ice', cap: 42, team: [{id:459,level:38},{id:215,level:38},{id:308,level:40},{id:460,level:42}] },
    { name: 'Volkner', type: 'electric', cap: 49, team: [{id:26,level:46},{id:424,level:47},{id:224,level:47},{id:405,level:49}] },
    { name: 'Aaron', cap: 57, isE4: true, team: [{id:269,level:53},{id:267,level:53},{id:416,level:54},{id:214,level:54},{id:452,level:57}] },
    { name: 'Bertha', cap: 59, isE4: true, team: [{id:195,level:55},{id:185,level:56},{id:76,level:56},{id:340,level:55},{id:450,level:59}] },
    { name: 'Flint', cap: 61, isE4: true, team: [{id:78,level:58},{id:208,level:57},{id:426,level:58},{id:428,level:57},{id:392,level:61}] },
    { name: 'Lucian', cap: 63, isE4: true, team: [{id:122,level:59},{id:203,level:59},{id:308,level:60},{id:65,level:60},{id:437,level:63}] },
    { name: 'Champion Cynthia', cap: 66, isE4: true, team: [{id:442,level:61},{id:407,level:60},{id:423,level:60},{id:448,level:63},{id:350,level:63},{id:445,level:66}] },
  ]},
  'platin': { label: 'Platin', labelEn: 'Platinum', entries: [
    { name: 'Roark', type: 'rock', cap: 14, team: [{id:74,level:12},{id:95,level:12},{id:408,level:14}] },
    { name: 'Gardenia', type: 'grass', cap: 22, team: [{id:387,level:20},{id:420,level:19},{id:407,level:22}] },
    { name: 'Fantina', type: 'ghost', cap: 26, team: [{id:200,level:24},{id:93,level:24},{id:429,level:26}] },
    { name: 'Maylene', type: 'fighting', cap: 32, team: [{id:307,level:30},{id:67,level:30},{id:448,level:32}] },
    { name: 'Crasher Wake', type: 'water', cap: 37, team: [{id:130,level:33},{id:195,level:34},{id:419,level:37}] },
    { name: 'Byron', type: 'steel', cap: 41, team: [{id:82,level:37},{id:436,level:38},{id:208,level:39},{id:411,level:41}] },
    { name: 'Candice', type: 'ice', cap: 44, team: [{id:215,level:40},{id:459,level:40},{id:308,level:40},{id:460,level:44}] },
    { name: 'Volkner', type: 'electric', cap: 50, team: [{id:135,level:46},{id:26,level:46},{id:405,level:48},{id:466,level:50}] },
    { name: 'Aaron', cap: 53, isE4: true, team: [{id:469,level:49},{id:416,level:50},{id:214,level:50},{id:212,level:51},{id:452,level:53}] },
    { name: 'Bertha', cap: 55, isE4: true, team: [{id:340,level:52},{id:185,level:53},{id:76,level:54},{id:472,level:55},{id:450,level:55}] },
    { name: 'Flint', cap: 57, isE4: true, team: [{id:229,level:54},{id:78,level:53},{id:136,level:55},{id:392,level:57},{id:467,level:57}] },
    { name: 'Lucian', cap: 59, isE4: true, team: [{id:122,level:56},{id:475,level:56},{id:196,level:56},{id:437,level:59},{id:65,level:59}] },
    { name: 'Champion Cynthia', cap: 62, isE4: true, team: [{id:442,level:58},{id:407,level:58},{id:423,level:60},{id:448,level:60},{id:350,level:58},{id:445,level:62}] },
  ]},
  'heartgold-soulsilver': { label: 'HeartGold / SoulSilver', labelEn: 'HeartGold / SoulSilver', entries: [
    { name: 'Falkner', type: 'flying', cap: 13, team: [{id:16,level:7},{id:17,level:13}] },
    { name: 'Ahornia', type: 'bug', cap: 17, team: [{id:14,level:15},{id:11,level:15},{id:123,level:17}] },
    { name: 'Whitney', type: 'normal', cap: 19, team: [{id:35,level:17},{id:241,level:19}] },
    { name: 'Morty', type: 'ghost', cap: 25, team: [{id:92,level:21},{id:93,level:23},{id:93,level:23},{id:94,level:25}] },
    { name: 'Chuck', type: 'fighting', cap: 31, team: [{id:57,level:29},{id:62,level:31}] },
    { name: 'Jasmine', type: 'steel', cap: 35, team: [{id:81,level:30},{id:81,level:30},{id:208,level:35}] },
    { name: 'Pryce', type: 'ice', cap: 34, team: [{id:86,level:30},{id:87,level:32},{id:221,level:34}] },
    { name: 'Clair', type: 'dragon', cap: 41, team: [{id:130,level:38},{id:148,level:38},{id:148,level:38},{id:230,level:41}] },
    { name: 'Will', cap: 42, isE4: true, team: [{id:124,level:41},{id:178,level:41},{id:103,level:41},{id:80,level:41},{id:178,level:42}] },
    { name: 'Koga', cap: 44, isE4: true, team: [{id:168,level:40},{id:49,level:41},{id:205,level:43},{id:89,level:42},{id:169,level:44}] },
    { name: 'Bruno', cap: 46, isE4: true, team: [{id:237,level:42},{id:106,level:42},{id:107,level:42},{id:95,level:43},{id:68,level:46}] },
    { name: 'Karen', cap: 47, isE4: true, team: [{id:197,level:42},{id:45,level:42},{id:198,level:44},{id:94,level:45},{id:229,level:47}] },
    { name: 'Champion Siegfried', cap: 50, isE4: true, team: [{id:130,level:44},{id:149,level:47},{id:149,level:47},{id:6,level:46},{id:142,level:46},{id:149,level:50}] },
    { name: 'Kanto (Post-Game)', isDivider: true, resetCount: true },
    { name: 'Rocko', type: 'rock', cap: 54, team: [{id:74,level:51},{id:75,level:51},{id:95,level:51},{id:139,level:52},{id:111,level:52},{id:141,level:54}] },
    { name: 'Misty', type: 'water', cap: 54, team: [{id:55,level:49},{id:195,level:49},{id:131,level:52},{id:121,level:54}] },
    { name: 'Surge', type: 'electric', cap: 53, team: [{id:101,level:50},{id:101,level:50},{id:26,level:51},{id:82,level:53},{id:101,level:51}] },
    { name: 'Erika', type: 'grass', cap: 56, team: [{id:114,level:52},{id:189,level:52},{id:71,level:54},{id:182,level:56}] },
    { name: 'Janine', type: 'poison', cap: 50, team: [{id:169,level:47},{id:110,level:47},{id:168,level:47},{id:169,level:50},{id:49,level:50}] },
    { name: 'Sabrina', type: 'psychic', cap: 55, team: [{id:196,level:53},{id:122,level:55},{id:65,level:55},{id:124,level:53}] },
    { name: 'Pyro', type: 'fire', cap: 59, team: [{id:58,level:54},{id:78,level:54},{id:219,level:58},{id:467,level:59}] },
    { name: 'Blau', cap: 58, isE4: true, team: [{id:18,level:56},{id:130,level:58},{id:112,level:56},{id:59,level:58},{id:65,level:54},{id:103,level:58}] },
    { name: 'Red', cap: 88, isE4: true, team: [{id:25,level:88},{id:196,level:73},{id:143,level:75},{id:3,level:77},{id:6,level:77},{id:9,level:77}] },
  ]},
  'schwarz-weiss': { label: 'Schwarz / Weiß', labelEn: 'Black / White', entries: [
    { name: 'Cilan / Chili / Cress', type: 'div.', cap: 14, variant: true, team: [{id:506,level:12},{id:511,level:14}] },
    { name: 'Lenora', type: 'normal', cap: 20, team: [{id:507,level:18},{id:505,level:20}] },
    { name: 'Burgh', type: 'bug', cap: 23, team: [{id:544,level:21},{id:557,level:21},{id:541,level:23}] },
    { name: 'Elesa', type: 'electric', cap: 27, team: [{id:587,level:25},{id:587,level:25},{id:523,level:27}] },
    { name: 'Clay', type: 'ground', cap: 31, team: [{id:552,level:29},{id:536,level:29},{id:530,level:31}] },
    { name: 'Skyla', type: 'flying', cap: 35, team: [{id:527,level:33},{id:521,level:33},{id:581,level:35}] },
    { name: 'Brycen', type: 'ice', cap: 39, team: [{id:584,level:37},{id:615,level:37},{id:614,level:39}] },
    { name: 'Drayden / Iris', type: 'dragon', cap: 43, variant: true, team: [{id:611,level:41},{id:611,level:41},{id:612,level:43}] },
    { name: 'Shauntal', cap: 50, isE4: true, team: [{id:563,level:48},{id:593,level:48},{id:623,level:50},{id:609,level:50}] },
    { name: 'Grimsley', cap: 50, isE4: true, team: [{id:560,level:48},{id:510,level:48},{id:625,level:50},{id:553,level:50}] },
    { name: 'Caitlin', cap: 50, isE4: true, team: [{id:518,level:48},{id:561,level:48},{id:579,level:50},{id:576,level:50}] },
    { name: 'Marshal', cap: 50, isE4: true, team: [{id:538,level:48},{id:539,level:48},{id:620,level:50},{id:534,level:50}] },
    { name: 'N', cap: 52, isE4: true, variant: true, team: [{id:644,level:52},{id:565,level:50},{id:567,level:50},{id:584,level:50},{id:571,level:50},{id:601,level:50}] },
    { name: 'Ghetsis', cap: 54, isE4: true, team: [{id:563,level:52},{id:626,level:52},{id:537,level:52},{id:625,level:52},{id:604,level:52},{id:635,level:54}] },
    { name: 'Post-Game', isDivider: true },
    { name: 'Champion Alder', cap: 77, isE4: true, team: [{id:617,level:75},{id:626,level:75},{id:589,level:75},{id:537,level:75},{id:621,level:77},{id:637,level:77}] },
  ]},
  'schwarz2-weiss2': { label: 'Schwarz 2 / Weiß 2', labelEn: 'Black 2 / White 2', entries: [
    { name: 'Cheren', type: 'normal', cap: 13, team: [{id:504,level:11},{id:506,level:13}] },
    { name: 'Roxie', type: 'poison', cap: 18, team: [{id:109,level:16},{id:544,level:18}] },
    { name: 'Burgh', type: 'bug', cap: 24, team: [{id:557,level:20},{id:540,level:22},{id:541,level:24}] },
    { name: 'Elesa', type: 'electric', cap: 30, team: [{id:587,level:28},{id:587,level:28},{id:180,level:30}] },
    { name: 'Clay', type: 'ground', cap: 33, team: [{id:552,level:31},{id:536,level:31},{id:530,level:33}] },
    { name: 'Skyla', type: 'flying', cap: 39, team: [{id:527,level:37},{id:521,level:37},{id:581,level:39}] },
    { name: 'Drayden', type: 'dragon', cap: 48, team: [{id:621,level:46},{id:330,level:46},{id:612,level:48}] },
    { name: 'Marlon', type: 'water', cap: 51, team: [{id:565,level:49},{id:321,level:49},{id:593,level:51}] },
    { name: 'Shauntal', cap: 56, isE4: true, team: [{id:563,level:52},{id:426,level:54},{id:609,level:54},{id:623,level:56}] },
    { name: 'Grimsley', cap: 56, isE4: true, team: [{id:510,level:52},{id:560,level:52},{id:553,level:56},{id:625,level:56}] },
    { name: 'Caitlin', cap: 56, isE4: true, team: [{id:518,level:52},{id:561,level:54},{id:579,level:54},{id:576,level:56}] },
    { name: 'Marshal', cap: 56, isE4: true, team: [{id:538,level:52},{id:539,level:52},{id:620,level:56},{id:534,level:56}] },
    { name: 'Champion Iris', cap: 59, isE4: true, team: [{id:635,level:57},{id:452,level:55},{id:306,level:57},{id:131,level:55},{id:567,level:57},{id:612,level:59}] },
  ]},
  'x-y': { label: 'X / Y', labelEn: 'X / Y', entries: [
    { name: 'Viola', type: 'bug', cap: 12, team: [{id:283,level:10},{id:666,level:12}] },
    { name: 'Grant', type: 'rock', cap: 25, team: [{id:698,level:25},{id:696,level:25}] },
    { name: 'Korrina', type: 'fighting', cap: 32, team: [{id:619,level:29},{id:67,level:28},{id:701,level:32}] },
    { name: 'Ramos', type: 'grass', cap: 34, team: [{id:189,level:30},{id:70,level:31},{id:673,level:34}] },
    { name: 'Clemont', type: 'electric', cap: 37, team: [{id:587,level:35},{id:82,level:35},{id:695,level:37}] },
    { name: 'Valerie', type: 'fairy', cap: 42, team: [{id:303,level:38},{id:122,level:39},{id:700,level:42}] },
    { name: 'Olympia', type: 'psychic', cap: 48, team: [{id:561,level:44},{id:199,level:45},{id:678,level:48}] },
    { name: 'Wulfric', type: 'ice', cap: 59, team: [{id:460,level:56},{id:615,level:55},{id:713,level:59}] },
    { name: 'Malva', cap: 65, isE4: true, team: [{id:668,level:63},{id:324,level:63},{id:609,level:63},{id:663,level:65}] },
    { name: 'Siebold', cap: 65, isE4: true, team: [{id:693,level:63},{id:130,level:63},{id:689,level:63},{id:121,level:65}] },
    { name: 'Wikstrom', cap: 65, isE4: true, team: [{id:707,level:63},{id:476,level:63},{id:212,level:63},{id:681,level:65}] },
    { name: 'Drasna', cap: 65, isE4: true, team: [{id:691,level:63},{id:621,level:63},{id:334,level:63},{id:715,level:65}] },
    { name: 'Champion Diantha', cap: 68, isE4: true, team: [{id:701,level:64},{id:697,level:65},{id:699,level:65},{id:711,level:65},{id:706,level:66},{id:282,level:68}] },
  ]},
  'omega-rubin-alpha-saphir': { label: 'Omega Rubin / Alpha Saphir', labelEn: 'Omega Ruby / Alpha Sapphire', entries: [
    { name: 'Roxanne', type: 'rock', cap: 14, team: [{id:74,level:12},{id:299,level:14}] },
    { name: 'Brawly', type: 'fighting', cap: 16, team: [{id:307,level:14},{id:296,level:16}] },
    { name: 'Wattson', type: 'electric', cap: 21, team: [{id:100,level:19},{id:82,level:19},{id:310,level:21}] },
    { name: 'Flannery', type: 'fire', cap: 28, team: [{id:322,level:24},{id:218,level:26},{id:324,level:28}] },
    { name: 'Norman', type: 'normal', cap: 30, team: [{id:327,level:27},{id:288,level:27},{id:264,level:29},{id:289,level:30}] },
    { name: 'Winona', type: 'flying', cap: 35, team: [{id:333,level:33},{id:227,level:33},{id:279,level:34},{id:357,level:34},{id:334,level:35}] },
    { name: 'Tate & Liza', type: 'psychic', cap: 45, team: [{id:337,level:45},{id:338,level:45}] },
    { name: 'Wallace', type: 'water', cap: 46, team: [{id:370,level:44},{id:364,level:44},{id:119,level:44},{id:340,level:44},{id:350,level:46}] },
    { name: 'Sidney', cap: 52, isE4: true, team: [{id:262,level:49},{id:275,level:50},{id:332,level:50},{id:319,level:52},{id:359,level:52}] },
    { name: 'Phoebe', cap: 53, isE4: true, team: [{id:356,level:51},{id:354,level:51},{id:302,level:53},{id:354,level:51},{id:477,level:53}] },
    { name: 'Glacia', cap: 54, isE4: true, team: [{id:364,level:52},{id:364,level:52},{id:362,level:52},{id:365,level:54},{id:478,level:54}] },
    { name: 'Drake', cap: 55, isE4: true, team: [{id:330,level:53},{id:334,level:54},{id:330,level:53},{id:230,level:54},{id:373,level:55}] },
    { name: 'Champion Steven', cap: 59, isE4: true, team: [{id:227,level:57},{id:344,level:57},{id:306,level:58},{id:346,level:57},{id:348,level:57},{id:376,level:59}] },
  ]},
  'sonne-mond': { label: 'Sonne / Mond', labelEn: 'Sun / Moon', entries: [
    { name: 'Ilima (Prüfung)', type: 'normal', cap: 12, team: [{id:735,level:11},{id:735,level:12}] },
    { name: 'Kahuna Hala', type: 'fighting', cap: 15, team: [{id:56,level:13},{id:739,level:14},{id:297,level:15}] },
    { name: 'Lana (Prüfung)', type: 'water', cap: 20, team: [{id:746,level:20}] },
    { name: 'Kiawe (Prüfung)', type: 'fire', cap: 22, team: [{id:105,level:22}] },
    { name: 'Mallow (Prüfung)', type: 'grass', cap: 24, team: [{id:754,level:24}] },
    { name: 'Kahuna Olivia', type: 'rock', cap: 27, team: [{id:299,level:26},{id:525,level:26},{id:745,level:27}] },
    { name: 'Sophocles (Prüfung)', type: 'electric', cap: 29, team: [{id:738,level:29}] },
    { name: 'Acerola (Prüfung)', type: 'ghost', cap: 33, team: [{id:778,level:33}] },
    { name: 'Kahuna Nanu', type: 'dark', cap: 39, team: [{id:302,level:36},{id:552,level:37},{id:53,level:39}] },
    { name: 'Kahuna Hapu', type: 'ground', cap: 48, team: [{id:51,level:44},{id:423,level:45},{id:330,level:46},{id:750,level:48}] },
    { name: 'E4 Hala', cap: 55, isE4: true, team: [{id:297,level:51},{id:740,level:52},{id:760,level:54},{id:62,level:53},{id:57,level:53}] },
    { name: 'E4 Olivia', cap: 55, isE4: true, team: [{id:348,level:52},{id:346,level:52},{id:141,level:54},{id:476,level:53},{id:745,level:55}] },
    { name: 'E4 Kahili', cap: 55, isE4: true, team: [{id:169,level:53},{id:741,level:53},{id:227,level:54},{id:630,level:54},{id:733,level:55}] },
    { name: 'E4 Acerola', cap: 55, isE4: true, team: [{id:302,level:54},{id:781,level:53},{id:770,level:53},{id:426,level:53},{id:778,level:55}] },
    { name: 'Champion Kukui', cap: 58, isE4: true, team: [{id:745,level:55},{id:628,level:57},{id:462,level:57},{id:38,level:58},{id:143,level:58},{id:727,level:58}] },
  ]},
  'ultrasonne-ultramond': { label: 'Ultrasonne / Ultramond', labelEn: 'Ultra Sun / Ultra Moon', entries: [
    { name: 'Ilima (Prüfung)', type: 'normal', cap: 12, team: [{id:735,level:11},{id:735,level:12}] },
    { name: 'Kahuna Hala', type: 'fighting', cap: 16, team: [{id:56,level:13},{id:739,level:14},{id:297,level:16}] },
    { name: 'Lana (Prüfung)', type: 'water', cap: 20, team: [{id:746,level:20}] },
    { name: 'Kiawe (Prüfung)', type: 'fire', cap: 22, team: [{id:105,level:22}] },
    { name: 'Mallow (Prüfung)', type: 'grass', cap: 24, team: [{id:754,level:24}] },
    { name: 'Kahuna Olivia', type: 'rock', cap: 28, team: [{id:299,level:26},{id:525,level:26},{id:745,level:28}] },
    { name: 'Sophocles (Prüfung)', type: 'electric', cap: 29, team: [{id:738,level:29}] },
    { name: 'Acerola (Prüfung)', type: 'ghost', cap: 33, team: [{id:778,level:33}] },
    { name: 'Kahuna Nanu', type: 'dark', cap: 44, team: [{id:302,level:41},{id:552,level:43},{id:53,level:44}] },
    { name: 'Mina (Prüfung)', type: 'fairy', cap: 50, team: [{id:210,level:49},{id:40,level:49},{id:756,level:49},{id:468,level:49},{id:743,level:50}] },
    { name: 'Kahuna Hapu', type: 'ground', cap: 54, team: [{id:51,level:50},{id:423,level:51},{id:330,level:52},{id:750,level:54}] },
    { name: 'E4 Molayne', cap: 57, isE4: true, team: [{id:375,level:54},{id:82,level:54},{id:227,level:55},{id:625,level:56},{id:376,level:57}] },
    { name: 'E4 Olivia', cap: 57, isE4: true, team: [{id:348,level:54},{id:346,level:54},{id:141,level:55},{id:476,level:56},{id:745,level:57}] },
    { name: 'E4 Kahili', cap: 57, isE4: true, team: [{id:169,level:55},{id:741,level:55},{id:227,level:56},{id:733,level:57},{id:630,level:57}] },
    { name: 'E4 Acerola', cap: 57, isE4: true, team: [{id:302,level:54},{id:781,level:54},{id:770,level:55},{id:426,level:55},{id:778,level:57}] },
    { name: 'Champion Kukui', cap: 60, isE4: true, team: [{id:745,level:58},{id:628,level:59},{id:462,level:59},{id:38,level:60},{id:143,level:60},{id:727,level:60}] },
  ]},
  'schwert-schild': { label: 'Schwert / Schild', labelEn: 'Sword / Shield', entries: [
    { name: 'Milo', type: 'grass', cap: 20, team: [{id:829,level:18},{id:830,level:20}] },
    { name: 'Nessa', type: 'water', cap: 24, team: [{id:118,level:22},{id:846,level:23},{id:834,level:24}] },
    { name: 'Kabu', type: 'fire', cap: 27, team: [{id:38,level:25},{id:59,level:25},{id:851,level:27}] },
    { name: 'Bea / Allister', type: 'fighting/ghost', cap: 36, variant: true, team: [{id:237,level:34},{id:675,level:34},{id:865,level:36},{id:68,level:36}] },
    { name: 'Opal', type: 'fairy', cap: 38, team: [{id:110,level:36},{id:468,level:37},{id:303,level:36},{id:869,level:38}] },
    { name: 'Gordie / Melony', type: 'rock/ice', cap: 42, variant: true, team: [{id:689,level:40},{id:213,level:40},{id:874,level:42}] },
    { name: 'Piers', type: 'dark', cap: 46, team: [{id:560,level:44},{id:687,level:44},{id:435,level:45},{id:862,level:46}] },
    { name: 'Raihan', type: 'dragon', cap: 48, team: [{id:330,level:46},{id:526,level:46},{id:844,level:47},{id:884,level:48}] },
    { name: 'Champion Leon', cap: 65, isE4: true, variant: true, team: [{id:681,level:62},{id:612,level:63},{id:866,level:64},{id:887,level:64},{id:537,level:64},{id:6,level:65}] },
  ]},
  'strahl-diamant-leucht-perl': { label: 'Str. Diamant / Leuch. Perl', labelEn: 'BD / SP', entries: [
    { name: 'Roark', type: 'rock', cap: 14, team: [{id:74,level:12},{id:95,level:12},{id:408,level:14}] },
    { name: 'Gardenia', type: 'grass', cap: 22, team: [{id:420,level:19},{id:387,level:19},{id:407,level:22}] },
    { name: 'Maylene', type: 'fighting', cap: 30, team: [{id:307,level:28},{id:67,level:27},{id:448,level:30}] },
    { name: 'Crasher Wake', type: 'water', cap: 30, team: [{id:130,level:27},{id:195,level:27},{id:419,level:30}] },
    { name: 'Fantina', type: 'ghost', cap: 36, team: [{id:426,level:32},{id:94,level:34},{id:429,level:36}] },
    { name: 'Byron', type: 'steel', cap: 39, team: [{id:436,level:36},{id:208,level:36},{id:411,level:39}] },
    { name: 'Candice', type: 'ice', cap: 42, team: [{id:459,level:38},{id:215,level:38},{id:308,level:40},{id:460,level:42}] },
    { name: 'Volkner', type: 'electric', cap: 49, team: [{id:26,level:46},{id:424,level:47},{id:224,level:47},{id:405,level:49}] },
    { name: 'Aaron', cap: 57, isE4: true, team: [{id:269,level:53},{id:267,level:53},{id:416,level:54},{id:214,level:54},{id:452,level:57}] },
    { name: 'Bertha', cap: 59, isE4: true, team: [{id:195,level:55},{id:185,level:56},{id:76,level:56},{id:340,level:55},{id:450,level:59}] },
    { name: 'Flint', cap: 61, isE4: true, team: [{id:78,level:58},{id:208,level:57},{id:426,level:58},{id:428,level:57},{id:392,level:61}] },
    { name: 'Lucian', cap: 63, isE4: true, team: [{id:122,level:59},{id:203,level:59},{id:308,level:60},{id:65,level:60},{id:437,level:63}] },
    { name: 'Champion Cynthia', cap: 66, isE4: true, team: [{id:442,level:61},{id:407,level:60},{id:423,level:60},{id:448,level:63},{id:350,level:63},{id:445,level:66}] },
  ]},
  'karmesin-purpur': { label: 'Karmesin / Purpur', labelEn: 'Scarlet / Violet', entries: [
    { name: 'Katy', type: 'bug', cap: 15, team: [{id:917,level:14},{id:919,level:14},{id:214,level:15}] },
    { name: 'Brassius', type: 'grass', cap: 17, team: [{id:928,level:16},{id:548,level:16},{id:185,level:17}] },
    { name: 'Iono', type: 'electric', cap: 24, team: [{id:940,level:23},{id:939,level:23},{id:404,level:23},{id:429,level:24}] },
    { name: 'Kofu', type: 'water', cap: 30, team: [{id:976,level:27},{id:961,level:28},{id:740,level:30}] },
    { name: 'Larry', type: 'normal', cap: 36, team: [{id:775,level:35},{id:982,level:35},{id:398,level:36}] },
    { name: 'Ryme', type: 'ghost', cap: 42, team: [{id:971,level:41},{id:972,level:41},{id:778,level:41},{id:94,level:42}] },
    { name: 'Tulip', type: 'psychic', cap: 45, team: [{id:956,level:44},{id:981,level:44},{id:282,level:44},{id:671,level:45}] },
    { name: 'Grusha', type: 'ice', cap: 48, team: [{id:873,level:47},{id:614,level:47},{id:975,level:47},{id:334,level:48}] },
    { name: 'Rika', cap: 58, isE4: true, team: [{id:340,level:57},{id:323,level:57},{id:232,level:57},{id:51,level:57},{id:980,level:58}] },
    { name: 'Poppy', cap: 59, isE4: true, team: [{id:879,level:58},{id:462,level:58},{id:437,level:58},{id:823,level:58},{id:959,level:59}] },
    { name: 'Larry', cap: 60, isE4: true, team: [{id:357,level:59},{id:398,level:59},{id:334,level:59},{id:973,level:60},{id:741,level:60}] },
    { name: 'Hassel', cap: 61, isE4: true, team: [{id:715,level:59},{id:612,level:60},{id:691,level:60},{id:841,level:60},{id:998,level:61}] },
    { name: 'Champion Geeta', cap: 62, isE4: true, team: [{id:956,level:61},{id:673,level:61},{id:976,level:61},{id:713,level:61},{id:983,level:61},{id:970,level:62}] },
  ]},
};

// Aktives Spiel des Hubs (pwa.js); ohne pwa.js die gemerkte Wahl bzw. das Spiel des aktiven Runs
const LCP_GAME_KEY = 'hub-lcp-game';
const RUN_GAME_ALIAS = { bdsp: 'strahl-diamant-leucht-perl', 'omega-rot-alpha-saphir': 'omega-rubin-alpha-saphir' };
function preferredLcpGame() {
  const hub = window.PokeHubGame && window.PokeHubGame.levelCaps();
  if (LEVEL_CAPS[hub]) return hub;
  try {
    const saved = localStorage.getItem(LCP_GAME_KEY);
    if (LEVEL_CAPS[saved]) return saved;
    const data = JSON.parse(localStorage.getItem('pokemon-run-dashboard-runs') || 'null');
    const game = data?.runs?.[data.active || 0]?.game;
    const key = RUN_GAME_ALIAS[game] || game;
    if (LEVEL_CAPS[key]) return key;
  } catch (e) { /* ohne Speicher: erstes Spiel */ }
  return Object.keys(LEVEL_CAPS)[0];
}
function rememberLcpGame(key) {
  try { localStorage.setItem(LCP_GAME_KEY, key); } catch (e) { /* nur nicht gemerkt */ }
  if (window.PokeHubGame) window.PokeHubGame.fromLevelCaps(key);
}

function buildGameSelect() {
  const sel = document.getElementById('lcp-game-select');
  if (!sel) return;
  const cur = sel.value || preferredLcpGame();
  sel.innerHTML = '';
  Object.entries(LEVEL_CAPS).forEach(([key, game]) => {
    const opt = document.createElement('option');
    opt.value = key;
    opt.textContent = window.LANG === 'en' ? (game.labelEn || game.label) : game.label;
    sel.appendChild(opt);
  });
  sel.value = LEVEL_CAPS[cur] ? cur : Object.keys(LEVEL_CAPS)[0];
}

// Trainer, die in den Level-Caps mit deutschem Namen eingetragen sind – im englischen Modus übersetzt
const LCP_NAMES_EN = {
  'Rocko':'Brock', 'Surge':'Lt. Surge', 'Pyro':'Blaine', 'Agathe':'Agatha', 'Siegfried':'Lance', 'Blau':'Blue',
  'Champion Blau':'Champion Blue', 'Champion Siegfried':'Champion Lance', 'Ahornia':'Bugsy',
};
function lcpName(name) {
  if (window.LANG !== 'en') return name;
  return LCP_NAMES_EN[name] || name.replace('(Prüfung)', '(Trial)');
}
function lcpToggleTitle() {
  const panel = document.getElementById('level-cap-panel'), btn = document.getElementById('lcp-toggle');
  if (!panel || !btn) return;
  const collapsed = panel.classList.contains('lcp-collapsed');
  btn.title = window.LANG === 'en' ? (collapsed ? 'Expand' : 'Collapse') : (collapsed ? 'Ausklappen' : 'Einklappen');
}
document.addEventListener('langchange', lcpToggleTitle);

function renderLevelCaps(gameKey) {
  const game = LEVEL_CAPS[gameKey];
  const list = document.getElementById('lcp-list');
  if (!game) { list.innerHTML = ''; return; }
  list.innerHTML = '';
  let gymCount = 0, e4Seen = false;
  let openRow = null, openPanel = null;

  for (const e of game.entries) {
    if (e.isDivider) {
      const d = document.createElement('div');
      d.className = 'lcp-entry lcp-divider';
      d.textContent = e.name;
      list.appendChild(d);
      if (e.resetCount) { gymCount = 0; e4Seen = false; }
      continue;
    }
    if (e.isE4 && !e4Seen) {
      const d = document.createElement('div');
      d.className = 'lcp-entry lcp-divider';
      d.textContent = window.t('e4-divider');
      list.appendChild(d);
      e4Seen = true;
    }
    const numStr = e.isE4 ? '★' : ++gymCount;
    const row = document.createElement('div');
    row.className = 'lcp-entry' + (e.isE4 ? ' lcp-e4' : '') + (e.team?.length ? ' lcp-has-team' : '');
    const typeDisplay = e.type ? e.type.split('/').map(t => window.typeLabel(t.trim()) || t.trim()).join('/') : '';
    const variantNote = e.variant ? window.t('variant-note') : '';
    row.innerHTML = `<span class="lcp-num">${numStr}</span><span class="lcp-name">${lcpName(e.name)}</span>${typeDisplay ? `<span class="lcp-type">${typeDisplay}</span>` : ''}${variantNote ? `<span class="lcp-variant" title="${variantNote}">${window.t('variant-badge')}</span>` : ''}${e.cap != null ? `<span class="lcp-cap">Lv.${e.cap}</span>` : ''}`;
    if (variantNote) row.title = variantNote;

    if (e.team?.length) {
      const panel = document.createElement('div');
      panel.className = 'lcp-team-panel';
      panel.innerHTML = (variantNote ? `<div class="lcp-team-note">${variantNote}</div>` : '') + e.team.map(m =>
        `<div class="lcp-team-mon"><img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${m.id}.png" loading="lazy" alt=""><span>Lv.${m.level}</span></div>`
      ).join('');

      row.addEventListener('click', () => {
        if (openPanel) { openPanel.remove(); openRow.classList.remove('lcp-team-open'); }
        if (openRow === row) { openRow = null; openPanel = null; return; }
        row.classList.add('lcp-team-open');
        row.after(panel);
        openRow = row; openPanel = panel;
      });
    }
    list.appendChild(row);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const sel = document.getElementById('lcp-game-select');
  buildGameSelect();
  sel.addEventListener('change', e => { rememberLcpGame(e.target.value); renderLevelCaps(e.target.value); });
  // Aktives Spiel woanders geändert: Leiste nachziehen
  document.addEventListener('hubgamechange', () => {
    const k = window.PokeHubGame && window.PokeHubGame.levelCaps();
    if (LEVEL_CAPS[k] && sel.value !== k) { sel.value = k; renderLevelCaps(k); }
  });
  renderLevelCaps(sel.value);

  document.getElementById('lcp-toggle').addEventListener('click', () => {
    const panel = document.getElementById('level-cap-panel');
    const collapsed = panel.classList.toggle('lcp-collapsed');
    // Desktop: Pfeil im Knopf; Handy: der Knopf selbst ist der Pfeil
    (document.getElementById('lcp-toggle-icon') || document.getElementById('lcp-toggle')).classList.toggle('is-collapsed', collapsed);
    lcpToggleTitle();
  });
});
