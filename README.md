# Clipservatives Audio Archive



This repository contains a large collection of far-right commentary/bullshit audio samples that are automatically transcribed and presented in a searchable index. The goal is to provide an archive samples for musicians everywhere but with an index of what was said.

![alt text](clipservative-clean.jpg)

## 📁 Structure

```
clipservatives/
├── docs/
│   └── index.html          # Generated transcript index (GitHub Pages)
├── samples/                # Audio files organized for browsing
│   ├── m/                  # Top-level folder is first letter
│   │   ├── mcenany/        # Then first word (show/speaker/subject)
│   │   │   └── mcenany-01.aiff
│   │   └── miller/
│   │       └── miller-01.aiff
│   └── w/
│       └── watters/
│           └── watters-01.aiff
└── README.md              # This file
```

## 🌐 View Transcripts

The transcripts are automatically generated and deployed to GitHub Pages:

**[View Live Transcripts →](https://voxpopulist.github.io/clipservatives)**

## 📝 About

Audio files in `samples/` are transcribed and an HTML index is generated in `docs/index.html` so the content can be browsed locally or via GitHub Pages. The transcripts include:

- ⏱️ Timestamped segments
- 🔍 Full-text search capability  
- 📱 Mobile-responsive interface
- 🎵 Embedded audio players

## 📊 Content Organization

Audio files are organized under `samples/` into letter → name subfolders (e.g., `samples/m/miller/miller-01.aiff`). Each file is processed to extract:

- Full transcript text
- Timestamp-aligned segments
- Searchable content index

## 🔗 Links

- [Live Transcript Index](https://voxpopulist.github.io/clipservatives)
- [Raw Audio Files](./docs)
