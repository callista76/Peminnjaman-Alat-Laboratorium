
let allkategori_alat = [];
let allalat = [];
let allpeminjaman = [];

const API = "http://localhost:5000/api";

// ==================================
// FUNGSI REQUEST API
// ==================================

async function requestAPI(url, options = {}) {
    const response = await fetch(url, options);

    const text = await response.text();

    let result = {};

    try {
        result = text ? JSON.parse(text) : {};
    } catch {
        result = {};
    }

    if (!response.ok) {
        throw new Error(
            result.error ||
            result.message ||
            `Terjadi kesalahan (${response.status})`
        );
    }

    return result;
}

// ==================================
// MEMUAT KATEGORI ALAT
// ==================================

async function loadkategori_alat() {
    const data = await requestAPI(`${API}/kategori_alat`);

    allkategori_alat = data;

    renderkategori_alat();
}

// ==================================
// MENAMPILKAN KATEGORI
// ==================================

function renderkategori_alat() {
    const container = document.getElementById("kategori-container");

    container.innerHTML = "";

    const btnAll = document.createElement("button");

    btnAll.type = "button";
    btnAll.textContent = "Semua";

    btnAll.className =
        "bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg shadow transition";

    btnAll.addEventListener("click", () => {
        renderalat(allalat);
    });

    container.appendChild(btnAll);

    allkategori_alat.forEach((kategori) => {
        const btn = document.createElement("button");

        btn.type = "button";
        btn.textContent = kategori.nama_kategori;

        btn.className =
            "bg-indigo-50 hover:bg-indigo-600 hover:text-white text-indigo-700 border border-indigo-200 px-5 py-2 rounded-lg transition";

        btn.addEventListener("click", () => {
            const hasil = allalat.filter((alat) =>
                Number(alat.id_kategori) ===
                Number(kategori.id_kategori)
            );

            renderalat(hasil);
        });

        container.appendChild(btn);
    });
}

// ==================================
// MEMUAT DATA ALAT
// ==================================

async function loadalat() {
    const data = await requestAPI(`${API}/alat`);

    allalat = data;

    renderalat(allalat);
    renderPilihanAlat(allalat);
}

// ==================================
// MENAMPILKAN DAFTAR ALAT
// ==================================

function renderalat(data) {
    const container = document.getElementById("alat-container");

    container.innerHTML = "";

    if (data.length === 0) {
        container.innerHTML = `
            <p class="text-gray-500">
                Data alat tidak ditemukan.
            </p>
        `;
        return;
    }

    data.forEach((alat) => {
        container.innerHTML += `
            <div class="bg-white border border-blue-100 rounded-xl p-5 shadow-sm hover:shadow-lg hover:border-blue-300 transition">

                <div class="flex items-center justify-between mb-4">
                    <div class="bg-blue-100 text-blue-700 p-3 rounded-lg">
                        <span class="text-2xl">🧰</span>
                    </div>

                    <span class="text-xs font-semibold px-3 py-1 rounded-full ${
                        Number(alat.stok) > 0
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                    }">
                        ${Number(alat.stok) > 0 ? "Tersedia" : "Habis"}
                    </span>
                </div>

                <h3 class="text-lg font-bold text-slate-800 mb-2">
                    ${alat.nama_alat}
                </h3>

                <div class="border-t pt-3 mt-3">
                    <p class="text-sm text-gray-500">
                        Stok tersedia
                    </p>

                    <p class="text-2xl font-bold text-blue-700">
                        ${alat.stok}
                    </p>
                </div>

            </div>
        `;
    });
}

// ==================================
// PILIHAN ALAT PADA FORM
// ==================================

function renderPilihanAlat(data) {
    const select = document.getElementById("id_alat");

    const nilaiSebelumnya = select.value;

    select.innerHTML = `
        <option value="">Pilih alat</option>
    `;

    data.forEach((alat) => {
        const option = document.createElement("option");

        option.value = alat.id_alat;
        option.textContent = alat.nama_alat;

        select.appendChild(option);
    });

    select.value = nilaiSebelumnya;
}

// ==================================
// RESET FORM SETELAH SIMPAN
// ==================================

function resetForm() {
    const form = document.getElementById("form-peminjaman");

    form.reset();

    document.getElementById("id_peminjaman").value = "";

    document.getElementById("id_alat").disabled = false;

    document.getElementById("tombol-simpan").textContent =
        "Simpan Peminjaman";
}

// ==================================
// SIMPAN DAN EDIT PEMINJAMAN
// ==================================

async function simpanPeminjaman(event) {
    event.preventDefault();

    const idPeminjaman =
        document.getElementById("id_peminjaman").value;

    const idAlat =
        document.getElementById("id_alat").value;

    const jumlah =
        Number(document.getElementById("jumlah").value);

    const namaPeminjam =
        document.getElementById("nama_peminjam").value.trim();

    const kelas =
        document.getElementById("kelas").value.trim();

    const tanggalPinjam =
        document.getElementById("tanggal-pinjam").value;

    const tanggalKembali =
        document.getElementById("tanggal-kembali").value;

    // Pemeriksaan data
    if (!idPeminjaman && !idAlat) {
        alert("Silakan pilih alat terlebih dahulu.");
        return;
    }

    if (!namaPeminjam || !kelas) {
        alert("Nama peminjam dan kelas harus diisi.");
        return;
    }

    if (!Number.isInteger(jumlah) || jumlah < 1) {
        alert("Jumlah harus berupa angka minimal 1.");
        return;
    }

    if (!tanggalPinjam || !tanggalKembali) {
        alert("Tanggal pinjam dan tanggal kembali harus diisi.");
        return;
    }

    if (tanggalKembali < tanggalPinjam) {
        alert("Tanggal kembali tidak boleh sebelum tanggal pinjam.");
        return;
    }

    // Data yang dikirim ke server
    const data = {
        nama_peminjam: namaPeminjam,
        kelas: kelas,
        tanggal_pinjam: tanggalPinjam,
        tanggal_kembali: tanggalKembali,
        jumlah: jumlah
    };

    // id_alat hanya diperlukan saat menambah peminjaman
    if (!idPeminjaman) {
        data.id_alat = idAlat;
    }

    try {
        const url = idPeminjaman
            ? `${API}/peminjaman/${idPeminjaman}`
            : `${API}/peminjaman`;

        const method = idPeminjaman ? "PUT" : "POST";

        const hasil = await requestAPI(url, {
            method: method,
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        });

        alert(
            idPeminjaman
                ? "Data peminjaman berhasil diperbarui!"
                : "Peminjaman berhasil ditambahkan!"
        );

        resetForm();

        await refreshData();

    } catch (error) {
        console.error("Gagal menyimpan peminjaman:", error);
        alert(error.message);
    }
}

// ==================================
// MEMUAT DATA PEMINJAMAN
// ==================================

async function loadpeminjaman() {
    const data = await requestAPI(`${API}/peminjaman`);

    allpeminjaman = data;

    renderpeminjaman(allpeminjaman);
}

// ==================================
// MENAMPILKAN TABEL PEMINJAMAN
// ==================================

function renderpeminjaman(data) {
    const container = document.getElementById("peminjaman-container");

    container.innerHTML = "";

    if (data.length === 0) {
        container.innerHTML = `
            <tr>
                <td colspan="9" class="p-5 text-gray-500">
                    Belum ada data peminjaman.
                </td>
            </tr>
        `;
        return;
    }

    data.forEach((peminjaman, index) => {
        const status = peminjaman.status;

        const warnaStatus =
            status === "Dikembalikan"
                ? "bg-green-100 text-green-700"
                : status === "Terlambat"
                    ? "bg-red-100 text-red-700"
                    : "bg-yellow-100 text-yellow-700";

        const tombolEdit =
            status === "Dipinjam"
                ? `
                    <button
                        type="button"
                        class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg mb-1"
                        onclick="editPeminjaman(${peminjaman.id_peminjaman})">
                        Edit
                    </button>
                `
                : "";

        const tombolKembali =
            status === "Dipinjam" || status === "Terlambat"
                ? `
                    <button
                        type="button"
                        class="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg"
                        onclick="kembalikanPeminjaman(${peminjaman.id_peminjaman})">
                        Kembalikan
                    </button>
                `
                : "";

        container.innerHTML += `
            <tr class="hover:bg-blue-50 transition">

                <td class="border border-slate-200 p-2">
                    ${index + 1}
                </td>

                <td class="border border-slate-200 p-2">
                    ${peminjaman.nama_peminjam}
                </td>

                <td class="border border-slate-200 p-2">
                    ${peminjaman.kelas}
                </td>

                <td class="border border-slate-200 p-2">
                    ${peminjaman.nama_alat || "-"}
                </td>

                <td class="border border-slate-200 p-2">
                    ${peminjaman.jumlah}
                </td>

                <td class="border border-slate-200 p-2">
                    ${String(peminjaman.tanggal_pinjam).slice(0, 10)}
                </td>

                <td class="border border-slate-200 p-2">
                    ${String(peminjaman.tanggal_kembali).slice(0, 10)}
                </td>

                <td class="border border-slate-200 p-2">
                    <span class="px-3 py-1 rounded-full font-semibold ${warnaStatus}">
                        ${status}
                    </span>
                </td>

                <td class="border border-slate-200 p-2">
                    <div class="flex flex-col gap-1">
                        ${tombolEdit}
                        ${tombolKembali || "-"}
                    </div>
                </td>

            </tr>
        `;
    });
}

// ==================================
// MENGEDIT DATA PEMINJAMAN
// ==================================

async function editPeminjaman(id) {
    try {
        const data = await requestAPI(`${API}/peminjaman`);

        const peminjaman = data.find(
            (item) =>
                Number(item.id_peminjaman) === Number(id)
        );

        if (!peminjaman) {
            alert("Data peminjaman tidak ditemukan.");
            return;
        }

        if (peminjaman.status !== "Dipinjam") {
            alert("Peminjaman ini tidak bisa diedit.");
            return;
        }

        document.getElementById("id_peminjaman").value =
            peminjaman.id_peminjaman;

        document.getElementById("nama_peminjam").value =
            peminjaman.nama_peminjam;

        document.getElementById("kelas").value =
            peminjaman.kelas;

        document.getElementById("tanggal-pinjam").value =
            String(peminjaman.tanggal_pinjam).slice(0, 10);

        document.getElementById("tanggal-kembali").value =
            String(peminjaman.tanggal_kembali).slice(0, 10);

        document.getElementById("id_alat").value =
            peminjaman.id_alat;

        // Alat dikunci karena endpoint PUT tidak mengubah id_alat
        document.getElementById("id_alat").disabled = true;

        document.getElementById("jumlah").value =
            peminjaman.jumlah;

        document.getElementById("tombol-simpan").textContent =
            "Simpan Perubahan";

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });

    } catch (error) {
        console.error("Gagal mengedit peminjaman:", error);
        alert(error.message);
    }
}

// ==================================
// MENGEMBALIKAN ALAT
// ==================================

async function kembalikanPeminjaman(id) {
    const yakin = confirm("Apakah alat sudah dikembalikan?");

    if (!yakin) {
        return;
    }

    try {
        await requestAPI(`${API}/peminjaman/${id}/kembali`, {
            method: "PUT"
        });

        alert("Alat berhasil dikembalikan!");

        await refreshData();

    } catch (error) {
        console.error("Gagal mengembalikan alat:", error);
        alert(error.message);
    }
}

// ==================================
// DASHBOARD TOTAL
// ==================================

function updateDashboard() {
    document.getElementById("total-alat").textContent =
        allalat.length;

    document.getElementById("total-stok").textContent =
        allalat.reduce(
            (total, alat) => total + Number(alat.stok || 0),
            0
        );

    document.getElementById("total-peminjaman").textContent =
        allpeminjaman.length;
}

// ==================================
// MEMPERBARUI SEMUA DATA
// ==================================

async function refreshData() {
    try {
        await loadkategori_alat();
        await loadalat();
        await loadpeminjaman();

        updateDashboard();

    } catch (error) {
        console.error("Gagal memuat data:", error);

        alert(
            "Gagal memuat data. Periksa server.js dan koneksi PostgreSQL."
        );
    }
}

// ==================================
// MENJALANKAN APLIKASI
// ==================================

document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("form-peminjaman");

    form.addEventListener("submit", simpanPeminjaman);

    // Fungsi tombol Edit dan Kembalikan dipanggil dari tabel
    window.editPeminjaman = editPeminjaman;
    window.kembalikanPeminjaman = kembalikanPeminjaman;

    refreshData();
});
