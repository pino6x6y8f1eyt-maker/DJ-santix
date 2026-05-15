const { Client, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus } = require('@discordjs/voice');
const play = require('play-dl');
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

const queue = new Map();

client.on('messageCreate', async msg => {
  if (!msg.content.startsWith('!') || msg.author.bot) return;
  const args = msg.content.slice(1).split(' ');
  const command = args.shift().toLowerCase();
  const serverQueue = queue.get(msg.guild.id);

  if (command === 'play') {
    const voiceChannel = msg.member.voice.channel;
    if (!voiceChannel) return msg.reply('🧱 Métete a un canal de voz pa, ¿o le canto a la pared?');
    const songInfo = await play.search(args.join(' '), { limit: 1 });
    const song = { title: songInfo[0].title, url: songInfo[0].url };
    
    if (!serverQueue) {
      const queueConstruct = { textChannel: msg.channel, voiceChannel, connection: null, songs: [], player: createAudioPlayer() };
      queue.set(msg.guild.id, queueConstruct);
      queueConstruct.songs.push(song);
      
      try {
        const connection = joinVoiceChannel({ channelId: voiceChannel.id, guildId: msg.guild.id, adapterCreator: msg.guild.voiceAdapterCreator });
        queueConstruct.connection = connection;
        playSong(msg.guild, queueConstruct.songs[0]);
      } catch (err) { console.log(err); }
    } else {
      serverQueue.songs.push(song);
      return msg.reply(`🧱 Rolón en cola: **${song.title}**`);
    }
  }
  
  if (command === 'skip') { serverQueue.player.stop(); msg.reply('🧱 Saltando rola pa'); }
  if (command === 'stop') { serverQueue.songs = []; serverQueue.player.stop(); msg.reply('🧱 Don Cubo se bajó de la bocina'); }
});

async function playSong(guild, song) {
  const serverQueue = queue.get(guild.id);
  if (!song) { serverQueue.connection.destroy(); queue.delete(guild.id); return; }
  const stream = await play.stream(song.url);
  const resource = createAudioResource(stream.stream, { inputType: stream.type });
  serverQueue.player.play(resource);
  serverQueue.connection.subscribe(serverQueue.player);
  serverQueue.player.on(AudioPlayerStatus.Idle, () => { serverQueue.songs.shift(); playSong(guild, serverQueue.songs[0]); });
  serverQueue.textChannel.send(`🧱 Sonando ahora: **${song.title}**`);
}

client.login(process.env.TOKEN);