require('dotenv').config();
const { Client, GatewayIntentBits, ActivityType, Events, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionsBitField } = require('discord.js');
const express = require('express');
const path = require('path'); // <--- NEW: Helps find your file correctly

// ---------------------------------------
// 1. WEB SERVER (The "Storefront")
// ---------------------------------------
const app = express();
const port = 3000;

// This tells the server: "When someone visits the home page, give them my website file."
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// This starts the website
app.listen(port, () => console.log(`Website & Bot running on port ${port}`));


// ---------------------------------------
// 2. DISCORD BOT (The "Security Guard")
// ---------------------------------------
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

client.once(Events.ClientReady, c => {
    console.log(`Logged in as ${c.user.tag}`);
    client.user.setPresence({
        activities: [{ name: 'SNAC-Hosting Tickets', type: ActivityType.Listening }],
        status: 'online',
    });
});

client.on(Events.MessageCreate, async message => {
    if (message.author.bot) return;

    // --- STATUS COMMAND ---
    if (message.content === '!status') {
        const maxPlayers = 500;
        const currentPlayers = 342; // You can make this random if you want: Math.floor(Math.random() * 100) + 300;
        const ping = 24;
        const totalBars = 10;
        const greenBars = Math.round((currentPlayers / maxPlayers) * totalBars);
        const progressBar = '🟩'.repeat(greenBars) + '⬛'.repeat(totalBars - greenBars);
        
        const chartData = {
            type: 'line',
            data: {
                labels: ['10m', '8m', '6m', '4m', '2m', 'Now'],
                datasets: [{
                    label: 'Players',
                    data: [210, 245, 300, 280, 320, 342], // Fake history data
                    borderColor: '#00ff00',
                    backgroundColor: 'rgba(0, 255, 0, 0.2)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0
                }]
            },
            options: {
                legend: { display: false },
                title: { display: true, text: 'Network Traffic (Incoming)', fontColor: '#00ff00' },
                scales: {
                    xAxes: [{ gridLines: { display: false }, ticks: { fontColor: '#999' } }],
                    yAxes: [{ gridLines: { color: '#333' }, ticks: { fontColor: '#999' } }]
                }
            }
        };
        const chartUrl = `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(chartData))}&backgroundColor=black&width=500&height=300`;

        const statsEmbed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setAuthor({ name: 'SNAC-Hosting • Systems Monitor', iconURL: 'https://cdn-icons-png.flaticon.com/512/9638/9638162.png' })
            .setTitle('🟢 Survival SMP (Node 1)')
            .setDescription(`**Status:** Online  •  **Region:** 🇩🇪 Germany  •  **Uptime:** 14d 2h`)
            .addFields(
                { name: '👥 Player Count', value: `${progressBar} **${currentPlayers}/${maxPlayers}**`, inline: false },
                { name: '📡 Latency', value: `\`${ping}ms\``, inline: true },
                { name: '💾 RAM Usage', value: `\`12GB / 64GB\``, inline: true },
                { name: '🛡️ Protection', value: `\`Active\``, inline: true },
            )
            .setImage(chartUrl)
            .setFooter({ text: 'Last updated' })
            .setTimestamp();

        message.reply({ embeds: [statsEmbed] });
    }

    // --- TICKET COMMAND ---
    if (message.content === '!ticket') {
        const ticketEmbed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setTitle('📩 SNAC-Hosting Support')
            .setDescription('Need help with your server? Click the button below.')
            .setFooter({ text: 'SNAC-Hosting Support' });

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder().setCustomId('create_ticket').setLabel('Open Ticket').setEmoji('📩').setStyle(ButtonStyle.Primary),
            );

        await message.channel.send({ embeds: [ticketEmbed], components: [row] });
    }
});

client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isButton()) return;

    // --- OPEN TICKET LOGIC ---
    if (interaction.customId === 'create_ticket') {
        const channelName = `ticket-${interaction.user.username}`;
        
        // Create a private channel
        const channel = await interaction.guild.channels.create({
            name: channelName,
            type: ChannelType.GuildText,
            permissionOverwrites: [
                { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
                { id: client.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] }
            ],
        });

        const ticketOpenEmbed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle(`👋 Hello ${interaction.user.username}`)
            .setDescription('Support will be with you shortly.\nTo close this ticket, click the button below.');
            
        const closeRow = new ActionRowBuilder()
            .addComponents(new ButtonBuilder().setCustomId('close_ticket').setLabel('Close Ticket').setEmoji('🔒').setStyle(ButtonStyle.Danger));
        
        await channel.send({ content: `<@${interaction.user.id}>`, embeds: [ticketOpenEmbed], components: [closeRow] });
        await interaction.reply({ content: `Ticket created: ${channel}`, ephemeral: true });
    }

    // --- CLOSE TICKET LOGIC ---
    if (interaction.customId === 'close_ticket') {
        await interaction.reply('Closing ticket in 5 seconds...');
        setTimeout(() => interaction.channel.delete(), 5000);
    }
});

client.login(process.env.TOKEN);