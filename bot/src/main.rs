mod commands;
mod config;
mod error;
mod interaction_cache;

use commands::send_token::{TokenMetadata, api::fetch_token_metadata};
use config::{config, init_config};
use interaction_cache::{
    InteractionCache, cleanup_old_tokens, create_interaction_cache, has_been_processed,
    mark_as_processed,
};
use solana_sdk::signature::{Keypair, read_keypair_file};
use std::env;
use std::sync::Arc;

use serenity::async_trait;
use serenity::builder::{CreateEmbed, CreateInteractionResponse, CreateInteractionResponseMessage};
use serenity::model::application::Interaction;
use serenity::model::colour::Color;
use serenity::model::gateway::Ready;
use serenity::model::id::GuildId;
use serenity::prelude::*;

struct SendTokenKeypair;
impl TypeMapKey for SendTokenKeypair {
    type Value = Arc<Keypair>;
}

struct SendTokenMetadata;
impl TypeMapKey for SendTokenMetadata {
    type Value = Arc<Option<TokenMetadata>>;
}

struct SendTokenInteractionCache;
impl TypeMapKey for SendTokenInteractionCache {
    type Value = InteractionCache;
}

struct Handler;

async fn handle_send_token_command(
    ctx: &Context,
    command: &serenity::model::application::CommandInteraction,
    expected_command: &str,
) -> commands::send_token::SendTokenResult {
    let data = ctx.data.read().await;

    match command.data.name.as_str() {
        name if name == expected_command => {
            let keypair = match data.get::<SendTokenKeypair>() {
                Some(kp) => kp,
                None => {
                    return commands::send_token::SendTokenResult {
                        message: "Application configuration error".to_string(),
                        message_type: commands::send_token::MessageType::Error,
                    };
                }
            };
            let token_metadata = match data.get::<SendTokenMetadata>() {
                Some(metadata) => metadata,
                None => {
                    return commands::send_token::SendTokenResult {
                        message: "Application configuration error".to_string(),
                        message_type: commands::send_token::MessageType::Error,
                    };
                }
            };

            commands::send_token::run(
                &command.data.options(),
                &command.user.id,
                keypair.clone(),
                token_metadata.clone(),
            )
            .await
        }
        _ => commands::send_token::SendTokenResult {
            message: "Command not found!".to_string(),
            message_type: commands::send_token::MessageType::Error,
        },
    }
}

async fn send_response_based_on_type(
    ctx: &Context,
    command: &serenity::model::application::CommandInteraction,
    result: commands::send_token::SendTokenResult,
) {
    match result.message_type {
        commands::send_token::MessageType::Error => {
            let embed = CreateEmbed::new()
                .description(&result.message)
                .color(Color::RED);
            if let Err(why) = command
                .edit_response(
                    &ctx.http,
                    serenity::builder::EditInteractionResponse::new()
                        .content(&config().default_send_token_message),
                )
                .await
            {
                println!("Cannot edit response for error: {why}");
            }
            let follow_up = serenity::builder::CreateInteractionResponseFollowup::new()
                .embed(embed)
                .ephemeral(true);
            if let Err(why) = command.create_followup(&ctx.http, follow_up).await {
                println!("Cannot send error follow-up: {why}");
            }
        }
        commands::send_token::MessageType::Warning => {
            let embed = CreateEmbed::new()
                .description(&result.message)
                .color(Color::ORANGE);
            if let Err(why) = command
                .edit_response(
                    &ctx.http,
                    serenity::builder::EditInteractionResponse::new()
                        .content("")
                        .embed(embed),
                )
                .await
            {
                println!("Cannot edit response for warning: {why}");
            }
        }
        commands::send_token::MessageType::Success => {
            if result.message.contains("|") {
                let parts: Vec<&str> = result.message.split("|").collect();
                let public_msg = parts[0];
                let ephemeral_msg = parts.get(1).copied().unwrap_or("");

                if !ephemeral_msg.is_empty() {
                    if let Err(why) = command
                        .edit_response(
                            &ctx.http,
                            serenity::builder::EditInteractionResponse::new().content(public_msg),
                        )
                        .await
                    {
                        println!("Cannot edit response: {why}");
                        return;
                    }

                    let follow_up = serenity::builder::CreateInteractionResponseFollowup::new()
                        .content(ephemeral_msg)
                        .ephemeral(true);
                    if let Err(why) = command.create_followup(&ctx.http, follow_up).await {
                        println!("Cannot send follow-up: {why}");
                    }
                }
            } else if let Err(why) = command
                    .edit_response(
                        &ctx.http,
                        serenity::builder::EditInteractionResponse::new().content(&result.message),
                    )
                    .await
                {
                    println!("Cannot edit response: {why}");
                }
        }
    }
}

#[async_trait]
impl EventHandler for Handler {
    async fn interaction_create(&self, ctx: Context, interaction: Interaction) {
        if let Interaction::Command(command) = interaction {
            let interaction_token = command.token.clone();

            let data = ctx.data.read().await;
            let interaction_cache = match data.get::<SendTokenInteractionCache>() {
                Some(cache) => cache,
                None => {
                    let _ = command
                        .create_response(&ctx.http, CreateInteractionResponse::Acknowledge)
                        .await;
                    return;
                }
            };

            if has_been_processed(interaction_cache, &interaction_token) {
                let _ = command
                    .create_response(&ctx.http, CreateInteractionResponse::Acknowledge)
                    .await;
                return;
            }

            mark_as_processed(interaction_cache, &interaction_token);

            let token_metadata = match data.get::<SendTokenMetadata>() {
                Some(metadata) => metadata,
                None => {
                    let _ = command
                        .create_response(&ctx.http, CreateInteractionResponse::Acknowledge)
                        .await;
                    return;
                }
            };
            let token_name = token_metadata
                .as_ref()
                .as_ref()
                .map(|m| m.name.to_lowercase())
                .unwrap_or_else(|| "tokens".to_string());
            let expected_command = format!("send{}", token_name);

            if let Err(why) = command
                .create_response(
                    &ctx.http,
                    CreateInteractionResponse::Defer(CreateInteractionResponseMessage::new()),
                )
                .await
            {
                println!("Cannot defer slash command: {why}");
                return;
            }

            drop(data);

            let result = handle_send_token_command(&ctx, &command, &expected_command).await;

            send_response_based_on_type(&ctx, &command, result).await;
        }
    }

    async fn ready(&self, ctx: Context, ready: Ready) {
        println!("{} is connected!", ready.user.name);

        let guild_id = GuildId::new(
            env::var("DISCORD_GUILD_ID")
                .expect("Expected DISCORD_GUILD_ID")
                .parse()
                .expect("DISCORD_GUILD_ID must be an integer"),
        );

        let data = ctx.data.read().await;
        let token_metadata = data
            .get::<SendTokenMetadata>()
            .expect("SendTokenMetadata not found");

        let _ = guild_id
            .set_commands(
                &ctx.http,
                vec![commands::send_token::register(token_metadata.clone())],
            )
            .await;
    }
}

#[tokio::main]
async fn main() {
    if let Err(e) = init_config() {
        eprintln!("Failed to load configuration: {}", e);
        std::process::exit(1);
    }

    let token = match env::var("DISCORD_BOT_TOKEN") {
        Ok(token) => token,
        Err(_) => {
            eprintln!("Missing DISCORD_BOT_TOKEN environment variable");
            std::process::exit(1);
        }
    };

    let keypair_path = match env::var("KEYPAIR_PATH") {
        Ok(path) => path,
        Err(_) => {
            eprintln!("Missing KEYPAIR_PATH environment variable");
            std::process::exit(1);
        }
    };

    let keypair = match read_keypair_file(&keypair_path) {
        Ok(kp) => Arc::new(kp),
        Err(e) => {
            eprintln!("Failed to load keypair from {}: {}", keypair_path, e);
            std::process::exit(1);
        }
    };
    let token_metadata = Arc::new(fetch_token_metadata().await);
    let interaction_cache = match create_interaction_cache() {
        Ok(cache) => cache,
        Err(e) => {
            eprintln!("Failed to create interaction cache: {}", e);
            std::process::exit(1);
        }
    };

    let mut client = match Client::builder(token, GatewayIntents::empty())
        .event_handler(Handler)
        .await
    {
        Ok(client) => client,
        Err(e) => {
            eprintln!("Error creating Discord client: {}", e);
            std::process::exit(1);
        }
    };

    {
        let mut data = client.data.write().await;
        data.insert::<SendTokenKeypair>(keypair);
        data.insert::<SendTokenMetadata>(token_metadata);
        data.insert::<SendTokenInteractionCache>(interaction_cache.clone());
    }

    {
        let cache_for_cleanup = interaction_cache;
        tokio::spawn(async move {
            let mut interval = tokio::time::interval(tokio::time::Duration::from_secs(6 * 60 * 60));
            loop {
                interval.tick().await;
                cleanup_old_tokens(&cache_for_cleanup);
            }
        });
    }

    if let Err(why) = client.start().await {
        eprintln!("Discord client error: {}", why);
        std::process::exit(1);
    }
}
