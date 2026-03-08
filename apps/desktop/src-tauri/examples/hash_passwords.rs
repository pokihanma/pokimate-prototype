// Run: cargo run --example hash_passwords
// Use output to fill 002_seed.sql user password_hash values.
fn main() {
    let cost = 12;
    for (name, pass) in [
        ("admin", "admin@007"),
        ("poki", "pokihanma@007"),
        ("demo", "demo007"),
    ] {
        let hash = bcrypt::hash(pass, cost).expect("bcrypt hash");
        println!("{}: {}", name, hash);
    }
}
