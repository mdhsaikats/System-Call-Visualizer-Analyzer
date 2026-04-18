// Initialize Lucide Icons
lucide.createIcons();

// DOM helpers
const tableBody = document.getElementById("syscallsTableBody");
const startBtn = document.getElementById("startSimBtn");
const stopBtn = document.getElementById("stopSimBtn");

function renderRows(rows) {
	if (!tableBody) return;
	tableBody.innerHTML = "";

	if (!rows || rows.length === 0) {
		tableBody.innerHTML = `
			<tr>
				<td class="px-4 py-3 text-zinc-500" colspan="7">No syscalls yet</td>
			</tr>
		`;
		return;
	}

	rows.forEach((r) => {
		const tr = document.createElement("tr");
		tr.className = "hover:bg-zinc-900/40";

		tr.innerHTML = `
			<td class="px-4 py-3">${r.time || "-"}</td>
			<td class="px-4 py-3">-</td>
			<td class="px-4 py-3">${r.process || "-"} <span class="text-zinc-500">(${r.pid || "-"})</span></td>
			<td class="px-4 py-3">${r.syscall || "-"}</td>
			<td class="px-4 py-3">${r.args || ""}</td>
			<td class="px-4 py-3 text-right">${r.returnVal || "0"}</td>
			<td class="px-4 py-3 text-right">${r.latency ? r.latency + " ms" : "-"}</td>
		`;

		tableBody.appendChild(tr);
	});
}

// Wire buttons
if (startBtn) {
	startBtn.addEventListener("click", async () => {
		await window.api.startSimulatedSyscalls(300);
	});
}

if (stopBtn) {
	stopBtn.addEventListener("click", async () => {
		await window.api.stopSimulatedSyscalls();
	});
}

// Subscribe to simulated updates
if (window.api && window.api.onSimulatedSyscalls) {
	window.api.onSimulatedSyscalls((payload) => {
		if (payload && payload.recentSyscalls) {
			renderRows(payload.recentSyscalls);
			lucide.createIcons();
		}
	});
}

// Initial fetch
if (window.api && window.api.getRecentSyscalls) {
	window.api.getRecentSyscalls().then((data) => {
		renderRows(data && data.slice ? data.slice(0, 20) : []);
	});
}


