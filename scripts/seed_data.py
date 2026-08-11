import os
import sys
import random
import uuid
from datetime import datetime, timedelta

# Add backend directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend')))

from app.database.session import SessionLocal, engine, Base
from app.models.models import User, Account, Transaction, Beneficiary, Notification, AuditLog
from app.core.security import get_password_hash

def seed():
    print("Initializing Database Schema...")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # Check if already seeded
        if db.query(User).count() > 0:
            print("Database already contains data. Skipping seed.")
            return

        print("Seeding Users...")
        users_data = [
            {"username": "admin", "password": "admin123", "email": "admin@sentryvault.com", "full_name": "System Administrator", "phone": "+1-555-0100", "role": "ADMIN"},
            {"username": "abhimanyu", "password": "abhi123", "email": "abhimanyu@sentryvault.com", "full_name": "Abhimanyu Kumar", "phone": "+1-555-0101", "role": "CUSTOMER"},
            {"username": "tanmay", "password": "tanmay123", "email": "tanmay@sentryvault.com", "full_name": "Tanmay Sune", "phone": "+1-555-0102", "role": "CUSTOMER"},
            {"username": "alex_morgan", "password": "Password123!", "email": "alex.morgan@sentryvault.com", "full_name": "Alex Morgan", "phone": "+1-555-0103", "role": "CUSTOMER"},
            {"username": "sarah_connor", "password": "Password123!", "email": "sarah.connor@sentryvault.com", "full_name": "Sarah Connor", "phone": "+1-555-0104", "role": "CUSTOMER"},
        ]

        users = []
        for ud in users_data:
            u = User(
                username=ud["username"],
                email=ud["email"],
                hashed_password=get_password_hash(ud["password"]),
                full_name=ud["full_name"],
                phone=ud["phone"],
                role=ud["role"],
                is_active=True
            )
            db.add(u)
            users.append(u)

        db.commit()
        for u in users:
            db.refresh(u)

        print(f"Created {len(users)} Users.")

        print("Seeding Accounts (10 Accounts)...")
        accounts = []
        acc_counter = 1001

        for u in users:
            # Savings Account
            savings = Account(
                user_id=u.id,
                account_number=f"309000{acc_counter}",
                account_type="SAVINGS",
                balance=round(random.uniform(25000.0, 150000.0), 2),
                currency="INR",
                ifsc_code="SBIN0001234",
                branch_name="Financial Center Plaza",
                status="ACTIVE"
            )
            acc_counter += 1
            db.add(savings)
            accounts.append(savings)

            # Current Account
            current = Account(
                user_id=u.id,
                account_number=f"309000{acc_counter}",
                account_type="CURRENT",
                balance=round(random.uniform(10000.0, 75000.0), 2),
                currency="INR",
                ifsc_code="SBIN0005678",
                branch_name="Downtown Corporate Branch",
                status="ACTIVE"
            )
            acc_counter += 1
            db.add(current)
            accounts.append(current)

        db.commit()
        for a in accounts:
            db.refresh(a)

        print(f"Created {len(accounts)} Accounts.")

        print("Seeding Beneficiaries (10 Beneficiaries)...")
        beneficiary_data = [
            {"user_id": users[1].id, "name": "Alice Green", "account_number": "9900112233", "bank_name": "Chase Bank", "nickname": "Landlord"},
            {"user_id": users[1].id, "name": "Bob Vance", "account_number": "8811223344", "bank_name": "Bank of America", "nickname": "Refrigeration Corp"},
            {"user_id": users[2].id, "name": "Charlie Brown", "account_number": "7722334455", "bank_name": "Wells Fargo", "nickname": "Brother"},
            {"user_id": users[2].id, "name": "Diana Prince", "account_number": "6633445566", "bank_name": "Citibank", "nickname": "Gym Membership"},
            {"user_id": users[3].id, "name": "Ethan Hunt", "account_number": "5544556677", "bank_name": "HSBC", "nickname": "Consultant"},
            {"user_id": users[3].id, "name": "Fiona Gallagher", "account_number": "4455667788", "bank_name": "Barclays", "nickname": "Sister"},
            {"user_id": users[4].id, "name": "George Clark", "account_number": "3366778899", "bank_name": "Capital One", "nickname": "Electric Utility"},
            {"user_id": users[4].id, "name": "Hannah Abbott", "account_number": "2277889900", "bank_name": "PNC Bank", "nickname": "Insurance"},
            {"user_id": users[1].id, "name": "Tanmay Sune (Internal)", "account_number": accounts[2].account_number, "bank_name": "SentryVault Bank", "nickname": "Tanmay Savings"},
            {"user_id": users[2].id, "name": "Abhimanyu Kumar (Internal)", "account_number": accounts[0].account_number, "bank_name": "SentryVault Bank", "nickname": "Abhimanyu Savings"},
        ]

        for bd in beneficiary_data:
            b = Beneficiary(
                user_id=bd["user_id"],
                name=bd["name"],
                account_number=bd["account_number"],
                bank_name=bd["bank_name"],
                ifsc_code="SBIN0001234",
                nickname=bd["nickname"]
            )
            db.add(b)

        db.commit()
        print("Created 10 Beneficiaries.")

        print("Seeding Transactions (100 Transactions)...")
        descriptions = [
            "Monthly Salary Credit", "Grocery Purchase", "Utility Bill Payment",
            "Peer-to-Peer Transfer", "ATM Cash Withdrawal", "Online Shopping",
            "Dining & Restaurant", "Subscription Renewal", "Consulting Fee", "Rent Payment"
        ]

        now = datetime.utcnow()
        transactions = []

        for i in range(100):
            days_ago = random.randint(0, 60)
            tx_time = now - timedelta(days=days_ago, hours=random.randint(0, 23), minutes=random.randint(0, 59))
            
            src_acc = random.choice(accounts)
            # Pick a target account distinct from source
            possible_targets = [a for a in accounts if a.id != src_acc.id]
            tgt_acc = random.choice(possible_targets)

            tx_type = random.choice(["TRANSFER", "DEPOSIT", "WITHDRAWAL"])
            amount = round(random.uniform(25.0, 1500.0), 2)

            if tx_type == "DEPOSIT":
                s_id = None
                t_id = tgt_acc.id
            elif tx_type == "WITHDRAWAL":
                s_id = src_acc.id
                t_id = None
            else:
                s_id = src_acc.id
                t_id = tgt_acc.id

            tx = Transaction(
                transaction_ref=f"TXN-{uuid.uuid4().hex[:12].upper()}",
                source_account_id=s_id,
                target_account_id=t_id,
                amount=amount,
                transaction_type=tx_type,
                description=random.choice(descriptions),
                status="COMPLETED",
                created_at=tx_time
            )
            db.add(tx)

        db.commit()
        print("Created 100 Transactions.")

        print("Seeding Notifications & Audit Logs...")
        for u in users:
            # Notifications
            n1 = Notification(
                user_id=u.id,
                title="Welcome to SecureBank Portal",
                message="Your online banking account is active. Enjoy seamless transfers with enterprise security monitoring.",
                type="INFO"
            )
            n2 = Notification(
                user_id=u.id,
                title="Security Alert: Successful Login",
                message="New login detected from device Chrome / Windows 11.",
                type="SECURITY"
            )
            db.add(n1)
            db.add(n2)

            # Audit logs
            al = AuditLog(
                user_id=u.id,
                action="INITIAL_SEED",
                ip_address="127.0.0.1",
                user_agent="SeedScript/1.0",
                details="Seeded initial account records and initial balance."
            )
            db.add(al)

        db.commit()
        print("Seed completed successfully!")

    except Exception as e:
        db.rollback()
        print(f"Error during seeding: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed()
