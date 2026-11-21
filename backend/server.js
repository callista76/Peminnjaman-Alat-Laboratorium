const express = require("express");
const cors = require("cors");
const app = express();
const {Pool} = require("pg");
app.use(cors());
app.use(express.json());

//pengganti db.js
const pool = new Pool({
user: "postgres",
 host: "localhost",
 database: "db_peminjama_alat",
 password: "calista07",
 port: "5432",
});

app.get("/api/kategori_alat", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM kategori_alat");
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Terjadi kesalahan pada server" });
  }
});

app.get("/api/alat", async (req, res) => {
    try {
        const query = `
        SELECT 
            p.id_alat,
            p.id_kategori,
            p.nama_alat,
            p.kondisi,
            p.stok,
            p.lokasi,
            c.nama_kategori AS nama_kategori
        FROM alat p
        LEFT JOIN kategori_alat c ON p.id_kategori = c.id_kategori
        ORDER BY p.id_kategori ASC
    `;

    
    const result = await pool.query(query);

    res.json(result.rows);

  } catch (err) {
    console.error(err.message);

    res.status(500).json({
      error: "Terjadi kesalahan saat memuat produk"
    });
  } 
});

app.post("/api/peminjaman", async (req, res) => {
  try {
    const {
      id_alat,
      nama_peminjam,
      kelas,
      tanggal_pinjam,
      tanggal_kembali,
      jumlah
    } = req.body;

    const result = await pool.query(
      `INSERT INTO peminjaman (id_alat, nama_peminjam, kelas, tanggal_pinjam, tanggal_kembali,jumlah) VALUES ($1, $2, $3, $4, $5,$6) RETURNING *`,
      [id_alat, nama_peminjam, kelas, tanggal_pinjam, tanggal_kembali,jumlah]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("ERROR POST PEMINJAMAN");
    res.status(500).json({
      error: "gagal menambahkan peminjaman"
     });
  }
});

app.put("/api/alat/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const {
            id_kategori, nama_alat, kondisi, stok, lokasi
        } = req.body;

        const result = await pool.query(
            `UPDATE alat
             SET id_kategori = $1,
                 nama_alat = $2,
                 kondisi = $3,
                 stok = $4,
                 lokasi = $5
             WHERE id_alat = $6
             RETURNING *`,
            [id_kategori, nama_alat, kondisi, stok, lokasi, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: "Alat tidak ditemukan"
            });
        }

        res.json(result.rows[0]);

    } catch (err) {
        console.error(err);
        res.status(500).json({
            error: "Gagal memperbarui alat"
        });
    }
});

app.delete('/api/alat/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query("DELETE FROM alat WHERE id_alat = $1 RETURNING *", [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Alat tidak ditemukan" });
    }
    res.json({ message: "Alat berhasil dihapus" });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "gagal menghapus alat" });
  }
});


app.get("/api/peminjaman", async (req, res) => {
  try {
    const query = `
    SELECT
      p.id_peminjaman,
      p.id_alat,
      p.nama_peminjam,
      p.kelas,
      p.tanggal_pinjam,
      p.tanggal_kembali,
      p.jumlah,
      p.status,
      a.nama_alat,
      c.nama_kategori
    FROM peminjaman p
    LEFT JOIN alat a ON p.id_alat = a.id_alat
    LEFT JOIN kategori_alat c ON a.id_kategori = c.id_kategori
    ORDER BY p.id_peminjaman ASC
    `;

    const result = await pool.query(query);

    res.json(result.rows);
  }catch (err) {
    console.error(err);

    res.status(500).json({
      error: "Terjadi kesalahan saat memuat produk"
    });
  }
});


// EDIT PEMINJAMAN

app.put("/api/peminjaman/:id", async (req, res) => {
    let client;

    try {
        const { id } = req.params;
        const {
            nama_peminjam,
            kelas,
            tanggal_pinjam,
            tanggal_kembali,
            jumlah
        } = req.body;

        client = await pool.connect();
        await client.query("BEGIN");

        // Mengambil data peminjaman sebelumnya
        const cek = await client.query(
            `SELECT * FROM peminjaman
             WHERE id_peminjaman = $1
             FOR UPDATE`,
            [id]
        );

        if (cek.rows.length === 0) {
            await client.query("ROLLBACK");
            return res.status(404).json({
                error: "Peminjaman tidak ditemukan"
            });
        }

        const dataLama = cek.rows[0];

        if (dataLama.status !== "Dipinjam") {
            await client.query("ROLLBACK");
            return res.status(400).json({
                error: "Peminjaman tidak bisa diedit"
            });
        }

        // Jika jumlah tidak dikirim, gunakan jumlah lama
        const jumlahBaru = jumlah === undefined
            ? Number(dataLama.jumlah)
            : Number(jumlah);

        if (!Number.isInteger(jumlahBaru) || jumlahBaru < 1) {
            await client.query("ROLLBACK");
            return res.status(400).json({
                error: "Jumlah harus berupa angka minimal 1"
            });
        }

        const selisih = jumlahBaru - Number(dataLama.jumlah);

        // Jika jumlah bertambah, stok alat dikurangi
        if (selisih > 0) {
            const stok = await client.query(
                `UPDATE alat
                 SET stok = stok - $1
                 WHERE id_alat = $2
                 AND stok >= $1
                 RETURNING *`,
                [selisih, dataLama.id_alat]
            );

            if (stok.rows.length === 0) {
                await client.query("ROLLBACK");
                return res.status(400).json({
                    error: "Stok alat tidak mencukupi"
                });
            }
        }

        // Jika jumlah berkurang, stok alat dikembalikan
        if (selisih < 0) {
            await client.query(
                `UPDATE alat
                 SET stok = stok + $1
                 WHERE id_alat = $2`,
                [Math.abs(selisih), dataLama.id_alat]
            );
        }

        // Memperbarui data peminjaman
        const result = await client.query(
            `UPDATE peminjaman
             SET nama_peminjam = $1,
                 kelas = $2,
                 tanggal_pinjam = $3,
                 tanggal_kembali = $4,
                 jumlah = $5
             WHERE id_peminjaman = $6
             RETURNING *`,
            [
                nama_peminjam,
                kelas,
                tanggal_pinjam,
                tanggal_kembali,
                jumlahBaru,
                id
            ]
        );

        await client.query("COMMIT");

        res.json({
            message: "Peminjaman berhasil diperbarui",
            data: result.rows[0]
        });

    } catch (err) {
        if (client) {
            try {
                await client.query("ROLLBACK");
            } catch (e) {
                console.error(e);
            }
        }

        console.error(err);
        res.status(500).json({
            error: "Gagal mengedit peminjaman"
        });

    } finally {
        if (client) client.release();
    }
});

// PENGEMBALIAN ALAT
app.put("/api/peminjaman/:id/kembali", async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            `UPDATE peminjaman
             SET status = 'Dikembalikan'
             WHERE id_peminjaman = $1
             AND status IN ('Dipinjam', 'Terlambat')
             RETURNING *`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(400).json({
                error: "Peminjaman tidak ditemukan atau sudah dikembalikan"
            });
        }

        res.json({
            message: "Alat berhasil dikembalikan",
            data: result.rows[0]
        });

    } catch (err) {
        res.status(500).json({
            error: "Gagal mengembalikan alat"
        });
    }
});

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server berhasil berjalan di http://localhost:${PORT}`);
});