'use strict';
/* ============================== SCRIPT: conversations as data (see js/dialogue.js for the format) ============================== */

const DIALOGUES = {};

/* ---------- Scene 4: Thyken ----------
  Flags set here: thyken_told_who, thyken_told_varn, thyken_told_gods, thyken_told_inquisition,
  thyken_told_mariveth, dinas_truth (Ichabod asked), raiden_doubt (Raiden asked), thyken_heard (ready for the Choice).
*/
DIALOGUES.thyken = {
  start: 'intro',
  nodes: {
    intro: {
      lines: [
        { text: 'The stair ends in a chamber the Library never finished burying. The fissure runs straight through it, breathing up a heat that smells of iron. On the near side, on bare stone, an old man sits with his back straight and his hands open on his knees.' },
        { text: 'Chains of black glass hold him. They run from his wrists and his throat to iron rings sunk in the floor, and they are not rusted, and they are not cold. They hum very faintly, like a struck bowl that never quite stops.' },
        { who: 'Thyken', text: 'Three of you, and a man with a lantern.', if: { will: true } },
        { who: 'Thyken', text: 'Three of you. Fewer than I hoped. More than I expected.', if: { will: false } },
        { who: 'Thyken', text: 'And one who smells of her.', if: { alive: 'ichabod' } },
        { who: 'Thyken', text: 'Sit, if you like. I have been sitting for some time, and I find I have stopped minding the company of the floor.' },
      ],
      next: 'hub',
    },

    hub: {
      lines: [{ who: 'Thyken', text: 'Ask. I have had a long while to decide what is worth saying.' }],
      again: [{ who: 'Thyken', text: 'Go on.' }],
      choices: [
        { text: 'Who are you?', go: 'who' },
        { text: 'Who put you in these chains?', go: 'varn' },
        { text: 'What is happening on the surface? You talk like you know.', go: 'inquisition' },
        { text: 'You said the gods are weak. All of them?', go: 'gods', if: { has: 'thyken_told_varn' } },
        { by: 'ichabod', text: 'She has been in my head since the Tome. Tell me what Dinas is.', go: 'dinas', if: { has: 'thyken_told_who' } },
        { text: 'Tell us about Mariveth.', go: 'mariveth', if: { has: 'thyken_told_who' } },
        { by: 'raiden', text: 'You speak of the Omnisiah as if he were a thief.', go: 'raiden', if: { has: 'thyken_told_inquisition' } },
        { text: 'What do you want from us?', go: 'ask', if: { has: ['thyken_told_varn', 'thyken_told_inquisition'] } },
      ],
    },

    who: {
      set: { thyken_told_who: true },
      lines: [
        { who: 'Thyken', text: 'Thyken. Keeper of this place, for as long as it had keepers, and of some things that were here before it. I served Dinas when her fires were young. I am one of the oldest she has left.' },
        { who: 'Thyken', text: 'I was alive when they took the water-mother\'s name out of the world. Temple by temple, text by text, prayer by prayer, until the sea itself forgot who it belonged to. Someone had to remember. I said I would. It was the last thing I ever volunteered for.' },
      ],
      next: 'hub',
    },

    varn: {
      set: { thyken_told_varn: true },
      lines: [
        { who: 'Thyken', text: 'Varn. He has come back, and he is not what the old songs made of him. He is Kael\'Vahr\'s avatar now. The earth\'s own hand. He set these chains, and he will be back for what they hold.' },
        { who: 'Thyken', text: 'Kael\'Vahr is not dead. He was bound beneath the Ironpeaks, and he dreams, and when he turns in his sleep your houses fall down. Varn means to wake him the rest of the way. A god does not wake for nothing. It needs an offering old enough to matter, and I am the oldest thing Varn could reach.' },
        { who: 'Thyken', text: 'If Kael\'Vahr wakes whole, he will not lie quietly in his mountain. He will go looking for the ones who put him there. The gods will stand face to face for the first time since the Unification, and nothing between them will survive it. Not your towns. Not your Church. Not this Library, nor anyone who remembers it.' },
        { who: 'kieran', text: 'And these chains. Same black glass as his blade, I\'d guess.', if: { alive: 'kieran' } },
        { who: 'Thyken', text: 'You would guess correctly. Everything he makes is the same stone. He is not an imaginative god.', if: { alive: 'kieran' } },
      ],
      next: 'hub',
    },

    inquisition: {
      set: { thyken_told_inquisition: true },
      lines: [
        { who: 'Thyken', text: 'The earth has moved, and your god has felt it, and he does not like it. The Omnisiah has sent his Inquisition to root out whatever the old powers have touched. That includes me. I imagine, in time, it includes some of you.' },
        { who: 'Thyken', text: 'They are marching on Olgareth. Whatever you decide in this room, they will be there before you could be.' },
        { text: 'Will\'s hand tightens on the lantern until the frame creaks.', if: { will: true } },
        { who: 'will', text: 'My wife is in Olgareth.', if: { will: true } },
        { who: 'Thyken', text: 'Then I am sorry. I am sorry in the way of a man who cannot help you, which is the most common way there is.', if: { will: true } },
      ],
      next: 'hub',
    },

    gods: {
      set: { thyken_told_gods: true },
      lines: [
        { who: 'Thyken', text: 'All of them, at once. I have never seen it before, and I am very old.' },
        { who: 'Thyken', text: 'The Omnisiah is weakened, and I do not know why. That frightens me more than anything Varn intends. Dinas is exposed, thin as a candle at the end of the night. Kael\'Vahr is waking, but he is not awake, and a thing that is only half awake can still be chained again.' },
        { who: 'Thyken', text: 'It is a window. Every god in the world is standing in it with their back turned. Windows close.' },
      ],
      next: 'hub',
    },

    dinas: {
      set: { dinas_truth: true },
      lines: [
        { text: 'Thyken looks at Ichabod for a long time. Long enough that the hum of the chains becomes the loudest thing in the room.' },
        { who: 'Thyken', text: 'She was a woman once. Mortal, as you are. She learned early that faith is a kind of fuel, and that fear burns hotter than love.' },
        { who: 'Thyken', text: 'When her worship had enemies, she had them taken, and she had them burned. Not one at a time. Hundreds, on pyres that lit the clouds from beneath. What rose off those fires, she drank. That is how a woman becomes a god. I served her through all of it.' },
        { who: 'Thyken', text: 'She bargained with the Omnisiah to outlive the Unification, and the price was that she may only act through people like you. One warlock at a time, because there is not enough of her left to do more. She is dwindling. She can die, warlock, the way your grandmother died. She knows it. Whatever she whispers to you, weigh it against that.' },
        { who: 'ichabod', text: 'She\'s afraid.' },
        { who: 'Thyken', text: 'She is old. Given long enough, it becomes the same thing.' },
      ],
      next: 'hub',
    },

    mariveth: {
      set: { thyken_told_mariveth: true },
      lines: [
        { who: 'Thyken', text: 'You spoke her name at my door. The Tome kept it for you. Someone wanted it kept, once, badly enough to hide it in a book that bites.', if: { eq: { mariveth_name_source: 'tome' } } },
        { who: 'Thyken', text: 'You spoke her name at my door. You found it in stains and sailors\' charms. People forget. Habits do not. That is how she has survived, if surviving is the word.', if: { eq: { mariveth_name_source: 'clues' } } },
        { who: 'Thyken', text: 'You spoke her name at my door, and Dinas gave it to you. She does nothing for free, warlock. Remember that you owe her.', if: { eq: { mariveth_name_source: 'whisper' } } },
        { who: 'Thyken', text: 'Mariveth. They did not kill her. You cannot kill water. They made the world forget her instead. Every temple broken, every text burned, every prayer punished until mothers stopped teaching it to their children. It took three generations. I watched all of them.' },
        { who: 'Thyken', text: 'She is still here, after a fashion. In every river and every rain. Dispersed. A name with no one left to answer to it, except an old man in chains and now, I suppose, you.' },
      ],
      next: 'hub',
    },

    raiden: {
      set: { raiden_doubt: true },
      lines: [
        { who: 'Thyken', text: 'Did your priests teach you the Unification as a war, or as a miracle?' },
        { who: 'raiden', text: 'As a mercy.' },
        { who: 'Thyken', text: 'It was a conquest. He is old, and he is patient, and he is very clever, and before he was a god he was something your priests have a different word for. I will not argue with your faith, paladin. I only knew him first.' },
        { text: 'Raiden says nothing. His hand has found the hilt of his sword without being told to.' },
      ],
      next: 'hub',
    },

    ask: {
      lines: [
        { who: 'Thyken', text: 'Want? Nothing you can give me. But there are two ways out of this room that matter, and you should hear them plainly.' },
        { who: 'Thyken', text: 'The first. Break these chains. They are Varn\'s work and they are meant for me, not for you. I walk out of here, and his offering walks out with me, and Kael\'Vahr stays as he is, half awake, for a while. Varn will find another way. He is patient. You will have bought time and nothing else.' },
        { who: 'Thyken', text: 'The second. Finish what Varn began, but turn it against him. My life, given here, can drive Kael\'Vahr back down instead of raising him. He sleeps longer. Varn is weakened for it. But one life will not carry it. It takes two. Mine, and one more.' },
        { who: 'Thyken', text: 'And Varn will feel it happen. He will come.' },
        { who: 'Thyken', text: 'I will not choose for you. I have chosen enough things for other people, and look where it has left me.' },
      ],
      choices: [
        { text: 'There are things we have not asked yet.', go: 'hub', repeat: true },
        { text: 'We need to think.', go: 'close' },
      ],
    },

    close: {
      set: { thyken_heard: true },
      lines: [
        { text: 'Thyken nods once and closes his eyes, as if he has said all of it many times before to an empty room and is relieved, finally, to have been heard.' },
        { who: 'Thyken', text: 'Take as long as you need. I am not going anywhere.' },
      ],
      end: true,
    },
  },
};

/* ---------- Scene 2: The Sealed Doors ----------
  Flags: knows_kaelvahr, knows_dinas, knows_mariveth, mariveth_name_source ('tome' | 'clues' | 'whisper', first route found wins),
  ichabod_revealed_tome, ichabod_hid_tome, dinas_whisper (permanent: Ichabod let Dinas speak through him).
  The clues in the cavern are handled in js/scenes.js; the names themselves are typed into the naming panel.
*/
DIALOGUES.doors = {
  start: 'intro',
  nodes: {
    intro: {
      lines: [
        { text: 'The doors are a single slab of black stone, split down the middle by a seam too fine to fit a blade into. Letters run across them in a hand that was patient and is long dead.' },
        { who: 'Inscription', text: '"The Forgotten Ones, Once Sharing in this Dominion, Now Finding Themselves Enslaved…"' },
        { text: 'Beneath the words, three seals are set into the stone, each the size of a palm. One is cut with a mountain. One is cut with a flame. The third has been scrubbed so hard that the rock around it has gone pale.' },
        { who: 'will', text: 'My grandfather used to say the old doors only open for the old names. I thought it was a thing you told children.', if: { will: true } },
      ],
      next: 'hub',
    },
    hub: {
      lines: [{ text: 'The doors wait. They are waiting to be told something.' }],
      again: [{ text: 'The doors wait.' }],
      choices: [
        { text: 'Who were the Forgotten Ones?', go: 'forgotten' },
        { by: 'ichabod', text: 'There is something in the Tome. I have been carrying it a while.', go: 'tome', if: { not: ['knows_mariveth', 'ichabod_hid_tome'] } },
        { by: 'ichabod', text: 'About the Tome. I should show you after all.', go: 'tome_show', if: { has: 'ichabod_hid_tome', not: 'ichabod_revealed_tome' } },
        { by: 'ichabod', text: 'I could ask her. She would know the name.', go: 'whisper', if: { has: 'knows_dinas', not: 'knows_mariveth' } },
        { text: 'Speak the names.', go: 'speak', repeat: true },
        { text: 'Step back.', go: 'leave', repeat: true },
      ],
    },
    forgotten: {
      setOnce: { knows_kaelvahr: true, knows_dinas: true },
      lines: [
        { who: 'raiden', text: 'The Church teaches that before the Unification there were false gods, and that the Omnisiah gathered their peoples into one faith. It never names them. Naming them was the error.' },
        { who: 'will', text: 'The mountain one is Kael\'Vahr. Every miner in the Ironpeaks knows that, whatever the priests say. You say it under your breath when the ground shakes, so he knows you are being polite.', if: { will: true } },
        { text: 'Someone has scratched a name beside the mountain seal in a rough, quick hand: KAEL\'VAHR.', if: { will: false } },
        { who: 'ichabod', text: 'And the flame is Dinas. I would know her anywhere. I think she is looking at that seal right now.', if: { alive: 'ichabod' } },
        { who: 'kieran', text: 'Which leaves the one somebody scrubbed off. That\'s the one that matters, then. Nobody scrubs a thing that doesn\'t matter.', if: { alive: 'kieran' } },
      ],
      next: 'hub',
    },
    tome: {
      lines: [
        { text: 'Ichabod opens the Tome of Four Corners. The pages turn on their own and stop. Pressed between two leaves is a scrap of something that is not paper, thin and grey as the skin of a fish.' },
        { who: 'ichabod', text: 'It has been in here since I found the book. I never told anyone. There is a name on it, and the name has been trying very hard not to be read.' },
      ],
      choices: [
        { by: 'ichabod', text: 'Show them.', go: 'tome_show' },
        { by: 'ichabod', text: 'Close the book.', go: 'tome_hide' },
      ],
    },
    tome_show: {
      set: { ichabod_revealed_tome: true, knows_mariveth: true },
      setOnce: { mariveth_name_source: 'tome' },
      lines: [
        { text: 'He holds the scrap to the light. The letters are written in something that might once have been ink and might once have been seawater.' },
        { who: 'Scrap', text: 'MARIVETH' },
        { who: 'raiden', text: 'I have never heard that name.' },
        { who: 'ichabod', text: 'No. That was the point of it.' },
      ],
      next: 'hub',
    },
    tome_hide: {
      set: { ichabod_hid_tome: true },
      lines: [
        { text: 'Ichabod shuts the Tome. Whatever was on the scrap, he keeps it.' },
        { who: 'ichabod', text: 'Not yet. Let us see what else this place gives up first.' },
      ],
      next: 'hub',
    },
    whisper: {
      set: { dinas_whisper: true, knows_mariveth: true },
      setOnce: { mariveth_name_source: 'whisper' },
      lines: [
        { text: 'Ichabod closes his eyes. For a moment every flame in the cavern leans toward him, as if a door has opened somewhere behind his head.' },
        { who: 'ichabod', text: '…Mariveth.' },
        { text: 'A thread of blood runs from his nose. He wipes it away with the back of his hand and does not look at any of you.' },
        { who: 'ichabod', text: 'She gave it up too easily. She wanted me to ask. That is the part I do not like.' },
      ],
      next: 'hub',
    },
    speak: { act: 'naming', lines: [{ text: 'You step up to the seals.' }], end: true },
    leave: { lines: [{ text: 'You step back from the doors.' }], end: true },
  },
};

/* ---------- Scene 3: The Library ----------
  Flags: took_sea_prayer / left_sea_prayers (sequel hook for Mariveth's restoration), read_ledger, saw_buried_wall, loot_<n>.
*/
DIALOGUES.library_enter = {
  start: 'a',
  nodes: {
    a: {
      lines: [
        { text: 'Past the doors, the air changes. You expect the smell of old paper and get fresh dirt instead, wet and close, as if the Library had been dug rather than built.' },
        { text: 'Shelves run away from you in rows that do not seem to end, out past the reach of any light you have. Overhead, the dome that held all of this has cracked open down its middle, and the crack runs on down through the floor and keeps going. The far side has come in entirely. Earth has poured through like grain from a split sack, and under the earth, everywhere, are books.' },
        { text: 'At the centre, where the fissure runs closest, a staircase goes down into the dark.' },
        { who: 'ichabod', text: 'The one I felt is below us. Closer now. And whatever is flaring under him is closer too.', if: { alive: 'ichabod' } },
      ],
      end: true,
    },
  },
};

DIALOGUES.mariveth_shelf = {
  start: 'a',
  nodes: {
    a: {
      lines: [
        { text: 'One shelf is dry. The earth that has got into everything else stops a hand\'s width short of it, and the books on it are whole: tide-charts, hand-drawn and coloured with care, and thin books of prayers written for the sea.' },
        { text: 'Each spine carries the same small mark, a wave, and beside it a name you now know how to read. Mariveth.', if: { has: 'knows_mariveth' } },
        { text: 'Each spine carries the same small mark, a wave, and beside it a name that has been scraped away.', if: { not: 'knows_mariveth' } },
        { text: 'One prayer lies loose on top of the charts, as if someone set it down meaning to come back for it.' },
        { who: 'Prayer', text: '"Take what I pour out and carry it home. I do not ask where home is. You know."' },
        { who: 'raiden', text: 'Whoever kept these down here was risking a pyre.', if: { alive: 'raiden' } },
      ],
      choices: [
        { text: 'Take the prayer.', go: 'take' },
        { text: 'Leave it where it was left.', go: 'leave' },
      ],
    },
    take: {
      set: { took_sea_prayer: true },
      lines: [{ text: 'You fold the prayer small and keep it close. It weighs nothing at all, and it is cool against you, the way a stone is cool when it has come out of a river.' }],
      end: true,
    },
    leave: {
      set: { left_sea_prayers: true },
      lines: [{ text: 'You leave it. Someone kept this shelf dry for a very long time. It seems wrong to be the one who starts taking from it.' }],
      end: true,
    },
    again: { lines: [{ text: 'The sea shelf is as dry as it was, and as quiet.' }], end: true },
  },
};

DIALOGUES.reading_stand = {
  start: 'a',
  nodes: {
    a: {
      set: { read_ledger: true },
      lines: [
        { text: 'The book on the stand is a ledger, open near its end. The hand is careful and cramped, and it gets less steady toward the bottom of the page.' },
        { who: 'Ledger', text: '"Water seeping through the east wall again. Moved the sea charts. They are always the first thing I move."' },
        { who: 'Ledger', text: '"The ground has been talking all month. I know whose voice that is. I have not answered."' },
        { who: 'Ledger', text: '"He came through the floor, not the door. In all my years, nobody has ever come through the floor."' },
        { text: 'The entry stops there. The pen lies in the gutter of the book, its nib dry.' },
      ],
      end: true,
    },
  },
};

DIALOGUES.buried_wall = {
  start: 'a',
  nodes: {
    a: {
      set: { saw_buried_wall: true },
      lines: [
        { text: 'Here the dome came down. The earth stands higher than your head and leans, still settling, and books show through it everywhere, spines out, like the ribs of something buried too shallow.' },
        { who: 'kieran', text: 'How many, do you think?', if: { alive: 'kieran' } },
        { who: 'ichabod', text: 'All of the ones that mattered, probably. That is usually how it goes.', if: { alive: 'ichabod' } },
        { text: 'Somewhere inside the mound, something shifts and a little dirt runs down the face of it, and then it is still again.' },
      ],
      end: true,
    },
  },
};

// Loot on the Library shelves, in map order (top to bottom, left to right). Effects are wired in at milestone 5.
const LOOT = [
  { relic: 'ember_ink', name: 'Ember ink', note: 'Ichabod\'s Eldritch Blast hits harder.',
    lines: [{ text: 'A sealed inkwell, warm to the touch. The ink moves when it is tilted, slower than ink should, and glows at the edges like a coal.' },
            { who: 'ichabod', text: 'Her scribes wrote in this. It remembers what fire is for.', if: { alive: 'ichabod' } }] },
  { relic: 'whetstone', name: 'Black-glass whetstone', note: 'Kieran\'s Sneak Attack cuts deeper.',
    lines: [{ text: 'A whetstone of black glass, worn into a curve by long use. Drawn along an edge, it leaves the steel cold.' },
            { who: 'kieran', text: 'Same stone as those chains, I\'d bet. Might as well make it work for us.', if: { alive: 'kieran' } }] },
  { item: 'draught', n: 2, name: 'Bitter draughts', note: 'Two draughts. Each one heals a hero in a fight.',
    lines: [{ text: 'Behind a row of ledgers, two stoppered bottles of something dark and bitter-smelling. A Keeper\'s remedy. It has not spoiled; nothing down here seems to.' }] },
  { relic: 'litany', name: 'Warden\'s Litany', note: 'Raiden\'s Lay on Hands heals more.',
    lines: [{ text: 'A small book of prayers for the dying. Its margins are full of a dozen different hands, each adding its own. Some of the prayers are to the Omnisiah. Some are older.' },
            { who: 'raiden', text: 'I know some of these. Not all of them.', if: { alive: 'raiden' } }] },
];

/* ---------- Scene 5: The Choice ----------
  A full-screen page (screen: true): every block of a node is shown at once, no timer.
  Flags: released_thyken, or sacrificed_thyken plus one of sacrificed_will / sacrificed_hero (= hero id).
  The permanent loss itself is applied by the scene (js/scenes.js) when the conversation ends with act 'sacrifice'.
*/
DIALOGUES.choice = {
  screen: true,
  start: 'open',
  nodes: {
    open: {
      lines: [
        { text: 'Thyken does not watch you decide. He has turned his face toward the fissure, and its light moves on him slowly, the way light moves on the bed of a river.' },
        { text: 'Nobody hurries you. Above, the Library settles and is quiet. Somewhere far overhead the Inquisition is walking toward Olgareth, a day closer than it was, and nothing you decide down here will make it walk any slower.' },
        { text: 'There are two ways out of this room that matter.' },
      ],
      choices: [
        { text: 'Break the chains. Let him go.', go: 'release_confirm', repeat: true },
        { text: 'Finish what Varn began. Give Thyken to the earth, and one more life with him.', go: 'sacrifice', repeat: true },
        { text: 'Not yet.', go: 'later', repeat: true },
      ],
    },
    later: { lines: [{ text: 'You step away. Thyken does not turn his head. He said he was not going anywhere, and he meant it.' }], end: true },

    release_confirm: {
      lines: [
        { text: 'If the chains break, Thyken walks out, and Varn\'s offering walks out with him. Kael\'Vahr stays as he is, half awake. Varn goes on looking for another way, and he is patient.' },
        { text: 'You will have bought time, and nothing else.' },
      ],
      choices: [
        { text: 'Break them.', go: 'release', repeat: true },
        { text: 'Wait.', go: 'open', repeat: true },
      ],
    },
    release: {
      set: { released_thyken: true },
      act: 'release',
      lines: [
        { text: 'The black glass is warm, and it hums in the hand like something alive. When it breaks, it breaks all at once, every chain together, with a sound like a bell cracking as it is struck.' },
        { text: 'Thyken stands. It takes him a long time. When he is all the way up he is taller than you thought he would be.' },
        { who: 'Thyken', text: 'Time, then. Spend it well. It is the only thing anyone has ever bought from a god.' },
        { who: 'Thyken', text: 'Do not look for me. You would not find me, and for a while, neither will he.' },
        { text: 'He goes up the stair without a light. You hear him climbing for a long time, and then you don\'t.' },
      ],
      end: true,
    },

    sacrifice: {
      lines: [
        { text: 'Thyken\'s life, and one more. He said it plainly, and he does not say it again.' },
        { text: 'Will has set his lantern down on the stone. None of you saw him do it.', if: { will: true } },
        { who: 'will', text: 'Let it be me.', if: { will: true } },
        { who: 'will', text: 'I have been thinking about it since he said it. I am the only one here who is no use in a fight. My wife is in Olgareth, with the Inquisition in front of her and the god of the mountain underneath her. If one life buys her a longer sleep from the earth, I would like it to be mine. I would like to have bought her something.', if: { will: true } },
        { text: 'There is no one down here to give but yourselves.', if: { will: false } },
      ],
      choices: [
        { text: 'Let Will go.', go: 'will_react', if: { will: true }, repeat: true },
        { by: 'raiden', text: 'It should be me.', go: 'offer_raiden', repeat: true },
        { by: 'ichabod', text: 'It should be me.', go: 'offer_ichabod', repeat: true },
        { by: 'kieran', text: 'It should be me.', go: 'offer_kieran', repeat: true },
        { text: 'Wait. Not like this.', go: 'open', repeat: true },
      ],
    },
    will_react: {
      lines: [
        { who: 'raiden', text: 'The Church would call this a sin. I don\'t know what I call it. I know I will remember your name, Will, which is more than the Church would do for you.', if: { alive: 'raiden' } },
        { who: 'ichabod', text: 'She is listening. Dinas. She is pleased by this. I want you to know that I am not.', if: { alive: 'ichabod' } },
        { who: 'kieran', text: 'Your wife. Somebody should be able to tell her properly. What do I say?', if: { alive: 'kieran' } },
        { who: 'will', text: 'Tell her I went down with a lantern. She will know the rest.', if: { alive: 'kieran' } },
      ],
      choices: [
        { text: 'Let him.', go: 'sac_will', repeat: true },
        { text: 'No. Not him.', go: 'sacrifice', repeat: true },
      ],
    },
    offer_raiden: {
      lines: [
        { who: 'raiden', text: 'My faith has told me what was right my whole life, and it lied to me about this. Let me do one thing because I chose it, and not because I was told.' },
        { text: 'This cannot be undone. Raiden will not walk out of this room.' },
      ],
      choices: [{ text: 'Let it be done.', go: 'sac_raiden', repeat: true }, { text: 'No.', go: 'sacrifice', repeat: true }],
    },
    offer_ichabod: {
      lines: [
        { who: 'ichabod', text: 'Dinas has had her hand on me since the Tome. If I go into the earth, her hand goes with me, and she has one less warlock to work through. That seems worth something. It might be the only thing I do that she did not want.' },
        { text: 'This cannot be undone. Ichabod will not walk out of this room.' },
      ],
      choices: [{ text: 'Let it be done.', go: 'sac_ichabod', repeat: true }, { text: 'No.', go: 'sacrifice', repeat: true }],
    },
    offer_kieran: {
      lines: [
        { who: 'kieran', text: 'Somebody tell my sister. Don\'t tell her it was brave. Tell her it was quick, and that I wasn\'t working for anyone when I did it.' },
        { text: 'This cannot be undone. Kieran will not walk out of this room.' },
      ],
      choices: [{ text: 'Let it be done.', go: 'sac_kieran', repeat: true }, { text: 'No.', go: 'sacrifice', repeat: true }],
    },
    sac_will:    { set: { sacrificed_thyken: true, sacrificed_will: true }, next: 'rite', lines: [{ text: 'Will picks his lantern up again before he goes to stand beside the old man. He does not seem to want to be in the dark for it.' }] },
    sac_raiden:  { set: { sacrificed_thyken: true, sacrificed_hero: 'raiden' }, next: 'rite', lines: [{ text: 'Raiden unbuckles his sword and lays it on the stone, carefully, the way you put down something you mean to come back for. Then he goes to stand beside the old man.' }] },
    sac_ichabod: { set: { sacrificed_thyken: true, sacrificed_hero: 'ichabod' }, next: 'rite', lines: [{ text: 'Ichabod hands the Tome to no one in particular and goes to stand beside the old man. The book is cold the moment it leaves his hands.' }] },
    sac_kieran:  { set: { sacrificed_thyken: true, sacrificed_hero: 'kieran' }, next: 'rite', lines: [{ text: 'Kieran leaves his knives where he was standing, both of them, side by side. Then he goes to stand beside the old man.' }] },
    rite: {
      act: 'sacrifice',
      lines: [
        { text: 'There is no ceremony. Thyken tells you what to do, and his voice is calm the whole time, and you do it.' },
        { text: 'The chains go first. They do not break. They sink, link by link, into the floor, and the floor takes them, and then it takes more.' },
        { who: 'Thyken', text: 'Remember her name. Remember all of them. That is the whole of my religion, and now it is yours.' },
        { text: 'The fissure flares once, white at its heart, and narrows by the width of a hand. Far below, something enormous turns over in its sleep, and is still.' },
        { text: 'Then the floor on the far side of the chamber splits open, and something climbs out of it.' },
      ],
      end: true,
    },
  },
};

/* ---------- Scene 7: The Quiet After ----------
  One reflective line per surviving hero (and Will, if he lived), spoken as captions while you walk out.
  The first line whose condition holds is used. Ichabod's dinas_whisper line is the permanent cost of the whisper route.
*/
const REFLECTIONS = {
  raiden: [
    { if: { has: 'sacrificed_will' }, text: 'I told him I would remember his name. I am going to have to decide what else I remember, now, and who taught me to forget it.' },
    { if: { has: 'sacrificed_hero' }, text: 'We left one of us down there. I keep waiting for the Church to tell me what that was. It is not going to.' },
    { if: { has: 'raiden_doubt' }, text: 'We let him walk out. I think that was mercy. I am less sure than I was this morning what mercy looks like, or whose it is.' },
    { text: 'We let him walk out. I would like to believe that was mercy.' },
  ],
  ichabod: [
    { if: { has: 'dinas_whisper' }, text: 'She has been quieter since the doors. Not gone. Quieter. Like someone who got what they came for and is in no hurry to say what it was.' },
    { if: { has: 'dinas_truth' }, text: 'A woman who burned people until she became a god. And I have been taking her calls.' },
    { text: 'The Tome is cold. First time since I found it.' },
  ],
  kieran: [
    { if: { has: 'sacrificed_will' }, text: 'I will find his wife. Someone should get to her before the Inquisition does, and tell her about the lantern.' },
    { if: { has: 'sacrificed_hero' }, text: 'I keep turning round to say something to someone who is not there.' },
    { text: 'An old man walks out of a hole in the ground and that is supposed to buy us time. I will believe it when I see the bill.' },
  ],
  will: [
    { text: 'Olgareth is north of here. If we walk through the night, we might be there before they are. We might not.' },
  ],
};

// End card: what the slice carries forward, in paragraphs. Built from flags.
function endingParagraphs() {
  const f = S.flags, p = [];
  const gone = f.sacrificed_hero ? HEROES[f.sacrificed_hero].name : f.sacrificed_will ? 'Will' : null;
  if (f.released_thyken) p.push('Thyken walked out of the Library on his own feet. Varn is still looking for an offering, and he is patient. Kael\'Vahr dreams on beneath the Ironpeaks, half awake.');
  else if (f.sacrificed_thyken) p.push(`Thyken gave himself to the earth, and ${gone} went with him. Kael\'Vahr sleeps deeper for it. Varn was taken back into the ground, and he is not dead.`);
  const src = { tome: 'Ichabod showed you the scrap he had kept hidden in the Tome, and Mariveth\'s name came back into the world from a page that had been waiting for someone to read it.',
    clues: 'You found Mariveth\'s name in wine stains, a sailor\'s charm and a chisel that slipped. People forget. Habits do not.',
    whisper: 'Dinas gave Ichabod Mariveth\'s name at the doors. She does nothing for free, and he has not yet been told the price.',
    spoken: 'You spoke Mariveth\'s name at the doors as though you had always known it.' }[f.mariveth_name_source];
  if (src) p.push(src + (f.took_sea_prayer ? ' A prayer from her dry shelf goes north with you.' : ''));
  const minds = [];
  if (f.dinas_truth) minds.push('Ichabod knows now what Dinas was, and what she fed on');
  if (f.raiden_doubt) minds.push('Raiden has started asking where the Omnisiah came from');
  if (minds.length) p.push(minds.join(', and ') + '.');
  return p;
}
