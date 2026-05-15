const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, getVoiceConnection } = require('@discordjs/voice');
const play = require('play-dl');

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildVoiceStates, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent
    ] 
});

const queue = new Map();
const prefix = ':';

client.once('ready', () => {
    console.log(`🧱 ¡DonCuboDJ! está online pa los panas`);
    client.user.setActivity('¡rolitas en panas.bxngh.lol!', { type: 'LISTENING' });
});

client.on('messageCreate', async msg => {
    if (!msg.content.startsWith(prefix) || msg.author.bot) return;
    
    const args = msg.content.slice(prefix.length).split(' ');
    const command = args.shift().toLowerCase();
    const serverQueue = queue.get(msg.guild.id);

    if (command === 'play' || command === 'p') {
        const voiceChannel = msg.member.voice.channel;
        if (!voiceChannel) return msg.reply('🧱 ¡Métete a un canal de voz pa! ¿O le canto a la pared?');
        if (!args[0]) return msg.reply('🧱 ¡Pasa el link o nombre de la rola pa!');

        const search = args.join(' ');
        const searchResult = await play.search(search, { limit: 1 });
        if (!searchResult[0]) return msg.reply('🧱 ¡No encontré esa rola pa! ¿Sí existe o te la inventaste?');
        
        const song = {
            title: searchResult[0].title,
            url: searchResult[0].url,
            duration: searchResult[0].durationRaw,
            requestedBy: msg.author.username
        };

        if (!serverQueue) {
            const queueConstruct = {
                textChannel: msg.channel,
                voiceChannel: voiceChannel,
                connection: null,
                songs: [],
                player: createAudioPlayer(),
                playing: true
            };

            queue.set(msg.guild.id, queueConstruct);
            queueConstruct.songs.push(song);

            try {
                const connection = joinVoiceChannel({
                    channelId: voiceChannel.id,
                    guildId: msg.guild.id,
                    adapterCreator: msg.guild.voiceAdapterCreator,
                });
                queueConstruct.connection = connection;
                playSong(msg.guild, queueConstruct.songs[0]);
            } catch (err) {
                console.log(err);
                queue.delete(msg.guild.id);
                return msg.reply('🧱 ¡No me pude meter al canal pa! Revisa mis permisos');
            }
        } else {
            serverQueue.songs.push(song);
            const embed = new EmbedBuilder()
               .setColor('#FF00FF')
               .setTitle('🧱 ¡Rolón agregado a la cola!')
               .setDescription(`**${song.title}**`)
               .addFields({ name: 'Duración', value: song.duration, inline: true }, { name: 'Pedida por', value: song.requestedBy, inline: true });
            return msg.channel.send({ embeds: [embed] });
        }
    }

    if (command === 'skip' || command === 's') {
        if (!msg.member.voice.channel) return msg.reply('🧱 ¡Métete al canal pa skipear!');
        if (!serverQueue) return msg.reply('🧱 ¡No hay rolas pa skipear pa!');
        serverQueue.player.stop();
        msg.reply('🧱 ¡Saltando rola! Siguienteee');
    }

    if (command === 'stop') {
        if (!msg.member.voice.channel) return msg.reply('🧱 ¡Métete al canal pa pararme!');
        if (!serverQueue) return msg.reply('🧱 ¡Ya estoy parado pa!');
        serverQueue.songs = [];
        serverQueue.player.stop();
        msg.reply('🧱 ¡Don Cubo se bajó de la bocina! Ya no hay música');
    }

    if (command === 'queue' || command === 'q') {
        if (!serverQueue) return msg.reply('🧱 ¡La cola está más vacía que zona sin loot pa!');
        const embed = new EmbedBuilder()
           .setColor('#00FFFF')
           .setTitle('🧱 ¡Cola de ¡DonCuboDJ!!')
           .setDescription(serverQueue.songs.map((song, i) => `**${i + 1}.** ${song.title} - \`${song.duration}\``).slice(0, 10).join('\n'));
        msg.channel.send({ embeds: [embed] });
    }

    if (command === 'pause') {
        if (!serverQueue) return msg.reply('🧱 ¡No hay nada sonando pa!');
        serverQueue.player.pause();
        msg.reply('🧱 ¡Pausado! Respira pa');
    }

    if (command === 'resume') {
        if (!serverQueue) return msg.reply('🧱 ¡No hay nada pa resumir pa!');
        serverQueue.player.unpause();
        msg.reply('🧱 ¡Seguimos con el perreo!');
    }
});

async function playSong(guild, song) {
    const serverQueue = queue.get(guild.id);
    if (!song) {
        serverQueue.connection.destroy();
        queue.delete(guild.id);
        return;
    }

    const stream = await play.stream(song.url);
    const resource = createAudioResource(stream.stream, { inputType: stream.type });
    serverQueue.player.play(resource);
    serverQueue.connection.subscribe(serverQueue.player);

    const embed = new EmbedBuilder()
       .setColor('#FF4500')
       .setTitle('🧱 ¡SONANDO AHORA!')
       .setDescription(`**${song.title}**`)
       .addFields({ name: 'Duración', value: song.duration, inline: true }, { name: 'La puso', value: song.requestedBy, inline: true })
       .setFooter({ text: '¡DonCuboDJ! - El DJ de panas.bxngh.lol' });

    serverQueue.textChannel.send({ embeds: [embed] });

    serverQueue.player.on(AudioPlayerStatus.Idle, () => {
        serverQueue.songs.shift();
        playSong(guild, serverQueue.songs[0]);
    });
}

client.login(process.env.TOKEN);