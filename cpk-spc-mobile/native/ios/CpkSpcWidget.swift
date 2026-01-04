import WidgetKit
import SwiftUI

struct CpkWidgetEntry: TimelineEntry {
    let date: Date
    let cpk: Double
    let oee: Double
    let lineName: String
    let status: CpkStatus
    
    enum CpkStatus {
        case good, warning, critical
        var color: Color {
            switch self {
            case .good: return .green
            case .warning: return .orange
            case .critical: return .red
            }
        }
    }
    
    static var placeholder: CpkWidgetEntry {
        CpkWidgetEntry(date: Date(), cpk: 1.33, oee: 0.85, lineName: "Line", status: .good)
    }
}

struct CpkWidgetProvider: TimelineProvider {
    func placeholder(in context: Context) -> CpkWidgetEntry { .placeholder }
    func getSnapshot(in context: Context, completion: @escaping (CpkWidgetEntry) -> Void) {
        completion(.placeholder)
    }
    func getTimeline(in context: Context, completion: @escaping (Timeline<CpkWidgetEntry>) -> Void) {
        let entry = CpkWidgetEntry.placeholder
        let timeline = Timeline(entries: [entry], policy: .after(Date().addingTimeInterval(900)))
        completion(timeline)
    }
}

struct SmallWidgetView: View {
    var entry: CpkWidgetEntry
    var body: some View {
        VStack(alignment: .leading) {
            HStack {
                Circle().fill(entry.status.color).frame(width: 8, height: 8)
                Text(entry.lineName).font(.caption2).foregroundColor(.secondary)
            }
            Spacer()
            Text("CPK").font(.caption2).foregroundColor(.secondary)
            Text(String(format: "%.2f", entry.cpk)).font(.system(size: 32, weight: .bold))
            Spacer()
        }.padding()
    }
}

@main
struct CpkSpcWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "CpkSpcWidget", provider: CpkWidgetProvider()) { entry in
            SmallWidgetView(entry: entry)
        }
        .configurationDisplayName("CPK Monitor")
        .description("Monitor CPK metrics")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}
