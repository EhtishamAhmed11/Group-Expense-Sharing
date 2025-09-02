CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- USER Table





CREATE TABLE users(
	id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
	email varchar(255) NOT NULL,
	password_hash varchar(255) not null,
	first_name varchar(100) not null,
	last_name varchar(100) not null,
	phone varchar(20),
	profile_picture_url TEXT,
	email_verified boolean default false,
	email_verification_token varchar(255),
	password_reset_token varchar(255),
	password_reset_expires timestamp,
	preferences JSONB DEFAULT '{}',
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	last_login TIMESTAMP,
	is_active BOOLEAN DEFAULT TRUE
);

-- GROUP TABLE

CREATE TABLE groups(
id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
name VARCHAR(255) NOT NULL,
description TEXT,
created_by UUID NOT NULL REFERENCES users(id) on DELETE CASCADE,
invite_code VARCHAR(10) UNIQUE NOT NULL,
member_count INTEGER DEFAULT 1,
is_active BOOLEAN DEFAULT TRUE,
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- GROUP MEMBERS (Many-to-many relationship)
CREATE TABLE group_members(
	id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
	group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
	user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	role VARCHAR(20) DEFAULT 'member' CHECK(role IN('admin','member')),
	joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	is_active BOOLEAN DEFAULT TRUE,
	UNIQUE(group_id,user_id)
);

-- EXPENSE CATEGORIES

CREATE TABLE expense_categories(
	id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
	name VARCHAR(100) UNIQUE NOT NULL,
	decription TEXT,
	icon VARCHAR(50),
	color VARCHAR(7), -- hex color code
	is_default BOOLEAN DEFAULT TRUE,
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- EXPENSE TABLE
CREATE TABLE expenses(
	id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
	amount DECIMAL(10,2) NOT NULL CHECK(amount>0),
	description VARCHAR(500) NOT NULL,
	category_id UUID REFERENCES expense_categories(id),
	expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
	created_by UUID NOT NULL REFERENCES users(id) on DELETE CASCADE,
	paid_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	
	--group expense filed (null for the personal expenses)
	
	group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
	
	--Expense type
	expense_type VARCHAR(20) DEFAULT 'personal' CHECK(expense_type IN('personal','group')),

	--split configuration
	split_type VARCHAR(20) DEFAULT 'equal' CHECK(expense_type IN ('equal','exact','percentage')),

	--Metadata 
	receipt_url TEXT,
	notes TEXT,
	is_settled BOOLEAN DEFAULT FALSE,
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

	--ensuring group expenses have group _id
	CONSTRAINT check_group_expense CHECK(
(expense_type = 'personal' AND group_id IS NULL) OR
(expense_type = 'group' AND group_id IS NOT NULL)
	)
);


-- expense pariticipants ( who participated in group expenses)

CREATE TABLE expense_participants(
id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
expense_id UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
amount_owed DECIMAL(10,2) NOT NULL DEFAULT 0,
percentage DECIMAL(5,2),-- for percentage splits
is_settle BOOLEAN DEFAULT FALSE,
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
UNIQUE(expense_id,user_id)
);


-- SETTLEMENTS (debt Payments)

CREATE TABLE settlements(
	id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    from_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    to_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    group_id UUID REFERENCES groups(id) ON DELETE SET NULL,
    description TEXT,
    settlement_method VARCHAR(50), -- cash, venmo, paypal, etc.
    
    -- Settlement status
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'disputed')),
    
    -- Confirmation tracking
    confirmed_by_payer BOOLEAN DEFAULT FALSE,
    confirmed_by_receiver BOOLEAN DEFAULT FALSE,
    confirmed_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- 8. INVITATIONS

CREATE TABLE invitations(
id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    invited_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    invited_email VARCHAR(255) NOT NULL,
    invited_user_id UUID REFERENCES users(id) ON DELETE CASCADE, -- If user exists
    invitation_token VARCHAR(255) UNIQUE NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
    expires_at TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP + INTERVAL '7 days'),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    responded_at TIMESTAMP
);
-- 9. AUDIT LOG (For tracking changes)
-- =================================================================
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL, -- CREATE, UPDATE, DELETE, SETTLE
    table_name VARCHAR(50) NOT NULL,
    record_id UUID NOT NULL,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- =================================================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- =================================================================

-- Update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to relevant tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_groups_updated_at BEFORE UPDATE ON groups FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON expenses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_settlements_updated_at BEFORE UPDATE ON settlements FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Update group member count
CREATE OR REPLACE FUNCTION update_group_member_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE groups SET member_count = member_count + 1 WHERE id = NEW.group_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE groups SET member_count = member_count - 1 WHERE id = OLD.group_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

CREATE TRIGGER group_member_count_trigger
    AFTER INSERT OR DELETE ON group_members
    FOR EACH ROW EXECUTE FUNCTION update_group_member_count();

-- =================================================================
-- VIEWS FOR COMMON QUERIES
-- =================================================================

-- User debt summary view
CREATE VIEW user_debt_summary AS
SELECT 
    u.id as user_id,
    u.first_name || ' ' || u.last_name as user_name,
    COALESCE(SUM(CASE WHEN ep.user_id = u.id THEN ep.amount_owed ELSE 0 END), 0) as total_owed_by_user,
    COALESCE(SUM(CASE WHEN e.paid_by = u.id THEN ep.amount_owed ELSE 0 END), 0) as total_owed_to_user,
    COALESCE(SUM(CASE WHEN e.paid_by = u.id THEN ep.amount_owed ELSE 0 END), 0) - 
    COALESCE(SUM(CASE WHEN ep.user_id = u.id THEN ep.amount_owed ELSE 0 END), 0) as net_balance
FROM users u
LEFT JOIN expenses e ON (e.created_by = u.id OR e.paid_by = u.id)
LEFT JOIN expense_participants ep ON e.id = ep.expense_id
WHERE e.expense_type = 'group' AND NOT ep.is_settle
GROUP BY u.id, u.first_name, u.last_name;

-- Group expense summary view
CREATE VIEW group_expense_summary AS
SELECT 
    g.id as group_id,
    g.name as group_name,
    COUNT(e.id) as total_expenses,
    COALESCE(SUM(e.amount), 0) as total_amount,
    AVG(e.amount) as avg_expense_amount,
    MAX(e.created_at) as last_expense_date
FROM groups g
LEFT JOIN expenses e ON g.id = e.group_id AND e.expense_type = 'group'
GROUP BY g.id, g.name;




INSERT INTO expense_categories (name, description, icon, color) VALUES
('Food & Dining', 'Restaurants, groceries, food delivery', 'utensils', '#FF6B6B'),
('Transportation', 'Gas, parking, public transport, ride shares', 'car', '#4ECDC4'),
('Entertainment', 'Movies, concerts, games, streaming', 'music', '#45B7D1'),
('Shopping', 'Clothing, electronics, household items', 'shopping-bag', '#96CEB4'),
('Utilities', 'Electricity, water, internet, phone', 'zap', '#FFEAA7'),
('Healthcare', 'Medical expenses, pharmacy, insurance', 'heart', '#FD79A8'),
('Travel', 'Flights, hotels, vacation expenses', 'plane', '#6C5CE7'),
('Other', 'Miscellaneous expenses', 'more-horizontal', '#A0A0A0');

EXPLAIN ANALYZE select * from expense_categories;