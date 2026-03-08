use tauri::Manager;

mod commands;
mod db;
mod models;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            let db_state = db::init(app).map_err(|e| e.to_string())?;
            app.manage(db_state);
            #[cfg(debug_assertions)]
            {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.open_devtools();
                }
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::auth_commands::auth_login,
            commands::auth_commands::auth_logout,
            commands::auth_commands::auth_get_session,
            commands::finance_commands::finance_list_accounts,
            commands::finance_commands::finance_create_account,
            commands::finance_commands::finance_update_account,
            commands::finance_commands::finance_soft_delete_account,
            commands::finance_commands::finance_list_categories,
            commands::finance_commands::finance_create_category,
            commands::finance_commands::finance_soft_delete_category,
            commands::finance_commands::finance_list_transactions,
            commands::finance_commands::finance_create_transaction,
            commands::finance_commands::finance_update_transaction,
            commands::finance_commands::finance_soft_delete_transaction,
            commands::finance_commands::finance_list_budgets,
            commands::finance_commands::finance_create_budget,
            commands::finance_commands::finance_soft_delete_budget,
            commands::finance_commands::finance_list_debts,
            commands::finance_commands::finance_create_debt,
            commands::finance_commands::finance_soft_delete_debt,
            commands::finance_commands::finance_list_subscriptions,
            commands::finance_commands::finance_create_subscription,
            commands::finance_commands::finance_soft_delete_subscription,
            commands::investment_commands::inv_list_assets,
            commands::investment_commands::inv_create_asset,
            commands::investment_commands::inv_soft_delete_asset,
            commands::investment_commands::inv_list_holdings,
            commands::investment_commands::inv_create_holding,
            commands::investment_commands::inv_soft_delete_holding,
            commands::investment_commands::inv_list_prices,
            commands::investment_commands::inv_upsert_price,
            commands::bank_import_commands::bank_import_list_jobs,
            commands::bank_import_commands::bank_import_create_job,
            commands::bank_import_commands::bank_import_update_job_status,
            commands::bank_import_commands::bank_import_list_merchant_rules,
            commands::bank_import_commands::bank_import_create_merchant_rule,
            commands::bank_import_commands::bank_import_delete_merchant_rule,
            commands::habits_commands::habits_list,
            commands::habits_commands::habits_create,
            commands::habits_commands::habits_soft_delete,
            commands::habits_commands::habits_list_checkins,
            commands::habits_commands::habits_upsert_checkin,
            commands::goals_commands::goals_list,
            commands::goals_commands::goals_create,
            commands::goals_commands::goals_soft_delete,
            commands::goals_commands::goals_add_deposit,
            commands::goals_commands::goals_list_deposits,
            commands::time_commands::time_list_entries,
            commands::time_commands::time_create_entry,
            commands::time_commands::time_stop_entry,
            commands::time_commands::time_soft_delete_entry,
            commands::dashboard_commands::dashboard_get_summary,
            commands::settings_commands::settings_get_config,
            commands::settings_commands::settings_set_config,
            commands::settings_commands::settings_get_user_profile,
            commands::log_commands::log_insert,
            commands::log_commands::log_list,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
