# System Call Visualizer & Analyzer

A powerful tool for visualizing and analyzing system calls made by processes on Linux systems. This project provides a user-friendly interface to monitor, log, and analyze system call activity, helping developers and system administrators detect anomalies, understand process behavior, and debug applications.

## Features

- **Real-time system call tracing** using `strace` integration
- **Interactive UI** for visualizing system call frequency, anomalies, and process activity
- **Anomaly detection** and statistical analysis of system calls
- **Exportable logs** for further analysis
- **Configurable monitoring** for specific processes or system-wide

## Project Structure

```
System-Call-Visualizer-Analyzer/
├── cmd/
│   └── app/
│       └── main.go                # Application entry point
├── internal/
│   ├── analyzer/                  # Anomaly detection and statistics
│   ├── config/                    # Configuration management
│   ├── logger/                    # Logging and export utilities
│   ├── process/                   # Process selection and listing
│   └── strace/                    # strace integration and parsing
├── ui/
│   ├── app.go                     # UI application logic
│   ├── layout.go                  # UI layout
│   ├── assets/                    # Static assets (images, etc.)
│   ├── components/                # UI components (charts, alerts, etc.)
│   ├── data/                      # Data storage (logs, etc.)
│   └── screens/                   # UI screens (dashboard, logs, monitor)
├── pkg/
│   └── utils/                     # Utility functions
├── scripts/
│   └── run_strace.sh              # Helper script to run strace
├── LICENSE
├── README.md
```

## Getting Started

1. **Clone the repository:**
   ```sh
   git clone <repo-url>
   cd System-Call-Visualizer-Analyzer
   ```
2. **Build the application:**
   ```sh
   go build -o syscall-visualizer ./cmd/app
   ```
3. **Run the application:**
   ```sh
   ./syscall-visualizer
   ```

## Requirements

- Go 1.18+
- Linux system with `strace` installed

## Usage

- Launch the application and use the UI to select processes to monitor.
- View real-time system call activity, frequency charts, and anomaly alerts.
- Export logs for offline analysis.

## Contributing

Contributions are welcome! Please open issues or submit pull requests for improvements and bug fixes.

## License

This project is licensed under the MIT License. See the LICENSE file for details.
