use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use cpal::{SampleFormat, Stream, StreamConfig};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};

/// Wrapper to make cpal::Stream Send + Sync.
/// This is safe on macOS because CoreAudio's AudioUnit streams are thread-safe.
#[allow(dead_code)]
struct SendStream(Stream);
unsafe impl Send for SendStream {}
unsafe impl Sync for SendStream {}

pub struct AudioRecorder {
    buffer: Arc<Mutex<Vec<f32>>>,
    is_recording: Arc<AtomicBool>,
    stream: Option<SendStream>,
    sample_rate: u32,
}

// AudioRecorder is now Send + Sync thanks to SendStream wrapper
unsafe impl Send for AudioRecorder {}
unsafe impl Sync for AudioRecorder {}

impl AudioRecorder {
    pub fn new() -> Self {
        Self {
            buffer: Arc::new(Mutex::new(Vec::new())),
            is_recording: Arc::new(AtomicBool::new(false)),
            stream: None,
            sample_rate: 16000,
        }
    }

    pub fn start(&mut self) -> Result<(), String> {
        if self.is_recording.load(Ordering::SeqCst) {
            return Err("Already recording".into());
        }

        let host = cpal::default_host();
        let device = host
            .default_input_device()
            .ok_or("No input device available")?;

        log::info!("Using input device: {}", device.name().unwrap_or_default());

        let supported_config = device
            .default_input_config()
            .map_err(|e| format!("Failed to get default input config: {}", e))?;

        let config: StreamConfig = supported_config.clone().into();
        let device_sample_rate = config.sample_rate.0;
        let channels = config.channels as usize;
        self.sample_rate = device_sample_rate;

        log::info!(
            "Recording at {} Hz, {} channels, format: {:?}",
            device_sample_rate,
            channels,
            supported_config.sample_format()
        );

        // Clear the buffer
        self.buffer.lock().unwrap().clear();

        let buffer = Arc::clone(&self.buffer);
        let is_recording = Arc::clone(&self.is_recording);

        let err_fn = |err: cpal::StreamError| {
            log::error!("Audio stream error: {}", err);
        };

        let stream = match supported_config.sample_format() {
            SampleFormat::F32 => device.build_input_stream(
                &config,
                move |data: &[f32], _: &cpal::InputCallbackInfo| {
                    if is_recording.load(Ordering::SeqCst) {
                        let mut buf = buffer.lock().unwrap();
                        for chunk in data.chunks(channels) {
                            let mono: f32 = chunk.iter().sum::<f32>() / channels as f32;
                            buf.push(mono);
                        }
                    }
                },
                err_fn,
                None,
            ),
            SampleFormat::I16 => {
                let buffer = Arc::clone(&self.buffer);
                let is_recording = Arc::clone(&self.is_recording);
                device.build_input_stream(
                    &config,
                    move |data: &[i16], _: &cpal::InputCallbackInfo| {
                        if is_recording.load(Ordering::SeqCst) {
                            let mut buf = buffer.lock().unwrap();
                            for chunk in data.chunks(channels) {
                                let mono: f32 = chunk.iter().map(|&s| s as f32 / 32768.0).sum::<f32>()
                                    / channels as f32;
                                buf.push(mono);
                            }
                        }
                    },
                    err_fn,
                    None,
                )
            }
            format => return Err(format!("Unsupported sample format: {:?}", format)),
        }
        .map_err(|e| format!("Failed to build input stream: {}", e))?;

        stream.play().map_err(|e| format!("Failed to start stream: {}", e))?;
        self.is_recording.store(true, Ordering::SeqCst);
        self.stream = Some(SendStream(stream));

        Ok(())
    }

    pub fn stop(&mut self) -> Result<(Vec<f32>, u32), String> {
        self.is_recording.store(false, Ordering::SeqCst);

        // Drop the stream to stop recording
        self.stream = None;

        let samples = {
            let mut buf = self.buffer.lock().unwrap();
            std::mem::take(&mut *buf)
        };

        let sample_rate = self.sample_rate;
        log::info!(
            "Recorded {} samples ({:.1}s at {} Hz)",
            samples.len(),
            samples.len() as f32 / sample_rate as f32,
            sample_rate
        );

        Ok((samples, sample_rate))
    }
}

/// Resample audio from source_rate to target_rate using linear interpolation
pub fn resample(samples: &[f32], source_rate: u32, target_rate: u32) -> Vec<f32> {
    if source_rate == target_rate {
        return samples.to_vec();
    }

    let ratio = source_rate as f64 / target_rate as f64;
    let output_len = (samples.len() as f64 / ratio) as usize;
    let mut output = Vec::with_capacity(output_len);

    for i in 0..output_len {
        let src_idx = i as f64 * ratio;
        let idx = src_idx as usize;
        let frac = src_idx - idx as f64;

        let sample = if idx + 1 < samples.len() {
            samples[idx] as f64 * (1.0 - frac) + samples[idx + 1] as f64 * frac
        } else if idx < samples.len() {
            samples[idx] as f64
        } else {
            0.0
        };

        output.push(sample as f32);
    }

    output
}
