const { Model, DataTypes } = require('sequelize');

module.exports = class User extends Model {
    static init(sequelize) {
        super.init({
            googleId: {
                type: DataTypes.STRING,
                unique: true,
                allowNull: false
            },
            email: {
                type: DataTypes.STRING,
                unique: true,
                allowNull: false,
                validate: {
                    isEmail: true
                }
            },
            name: {
                type: DataTypes.STRING,
                allowNull: false
            },
            credits: {
                type: DataTypes.INTEGER,
                defaultValue: 1
            }
        }, {
            sequelize,
            modelName: 'User',
            tableName: 'users',
            timestamps: true,
            createdAt: 'createdAt',
            updatedAt: 'updatedAt',
            indexes: [
                {
                    unique: true,
                    fields: ['googleId']
                },
                {
                    unique: true,
                    fields: ['email']
                }
            ]
        });
    }



    // Add these methods to your User class
    static async deductCreditAtomic(userId) {
        return await this.sequelize.transaction(async (transaction) => {
            const user = await this.findByPk(userId, {
                lock: transaction.LOCK.UPDATE,
                transaction
            });

            if (!user) throw new Error('User not found');
            if (user.credits < 1) return false;

            user.credits -= 1;
            await user.save({ transaction });
            return true;
        });
    }

    static async refundCreditAtomic(userId) {
        return await this.sequelize.transaction(async (transaction) => {
            const user = await this.findByPk(userId, {
                lock: transaction.LOCK.UPDATE,
                transaction
            });

            if (!user) throw new Error('User not found');

            user.credits += 1;
            await user.save({ transaction });
            return true;
        });
    }

};