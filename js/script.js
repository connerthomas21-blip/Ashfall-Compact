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
