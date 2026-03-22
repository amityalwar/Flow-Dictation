use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum FormatStyle {
    #[serde(rename = "clean_grammar")]
    CleanGrammar,
    #[serde(rename = "professional_email")]
    ProfessionalEmail,
    #[serde(rename = "bullet_points")]
    BulletPoints,
    #[serde(rename = "meeting_notes")]
    MeetingNotes,
    #[serde(rename = "casual_message")]
    CasualMessage,
    #[serde(rename = "technical_doc")]
    TechnicalDoc,
    #[serde(rename = "raw")]
    Raw,
}

impl FormatStyle {
    pub fn system_prompt(&self) -> &'static str {
        match self {
            FormatStyle::CleanGrammar => {
                "You are a text formatter. Take the following voice dictation transcript and clean it up. \
                Fix grammar, punctuation, and spelling errors. Remove filler words (um, uh, like, you know). \
                Keep the original meaning and tone. Output ONLY the cleaned text, nothing else."
            }
            FormatStyle::ProfessionalEmail => {
                "You are a text formatter. Take the following voice dictation transcript and reformat it \
                as a professional email. Fix grammar, remove filler words, and structure it with a proper \
                greeting, body paragraphs, and sign-off. Output ONLY the formatted email, nothing else."
            }
            FormatStyle::BulletPoints => {
                "You are a text formatter. Take the following voice dictation transcript and convert it \
                into a clear, organized bullet point list. Group related points together. Fix grammar and \
                remove filler words. Output ONLY the bullet points, nothing else."
            }
            FormatStyle::MeetingNotes => {
                "You are a text formatter. Take the following voice dictation transcript and format it as \
                structured meeting notes. Include sections for key topics, action items, and decisions if \
                applicable. Fix grammar and remove filler words. Output ONLY the meeting notes, nothing else."
            }
            FormatStyle::CasualMessage => {
                "You are a text formatter. Take the following voice dictation transcript and clean it up \
                into a casual message suitable for texting or chat. Keep the tone informal and friendly. \
                Fix obvious errors but maintain the casual feel. Output ONLY the message, nothing else."
            }
            FormatStyle::TechnicalDoc => {
                "You are a text formatter. Take the following voice dictation transcript and format it as \
                clear technical documentation. Use proper technical writing conventions, organize logically, \
                and ensure precision. Output ONLY the formatted documentation, nothing else."
            }
            FormatStyle::Raw => {
                "" // Raw style returns the transcript as-is
            }
        }
    }
}

/// Format a transcript using the Gemini Flash API
pub async fn format_with_gemini(
    transcript: &str,
    style: FormatStyle,
    api_key: &str,
) -> Result<String, String> {
    if matches!(style, FormatStyle::Raw) {
        return Ok(transcript.to_string());
    }

    let system_prompt = style.system_prompt();

    let body = serde_json::json!({
        "contents": [{
            "parts": [{
                "text": format!("{}\n\nTranscript:\n{}", system_prompt, transcript)
            }]
        }],
        "generationConfig": {
            "temperature": 0.3,
            "maxOutputTokens": 2048
        }
    });

    let url = format!(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key={}",
        api_key
    );

    let client = reqwest::Client::new();
    let response = client
        .post(&url)
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Gemini API request failed: {}", e))?;

    let status = response.status();
    let response_text = response
        .text()
        .await
        .map_err(|e| format!("Failed to read response: {}", e))?;

    if !status.is_success() {
        return Err(format!("Gemini API error ({}): {}", status, response_text));
    }

    let json: serde_json::Value = serde_json::from_str(&response_text)
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    let text = json["candidates"][0]["content"]["parts"][0]["text"]
        .as_str()
        .ok_or("No text in Gemini response")?
        .trim()
        .to_string();

    log::info!("Formatted text: {} chars", text.len());
    Ok(text)
}
