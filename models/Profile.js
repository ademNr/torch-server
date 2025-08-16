module.exports = (sequelize, DataTypes) => {
    const Profile = sequelize.define('Profile', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        name: DataTypes.STRING,
        age: DataTypes.INTEGER,
        distance: DataTypes.INTEGER,
        tinderId: DataTypes.STRING,
        scrapedAt: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW
        }
    }, {
        timestamps: false
    });

    Profile.associate = (models) => {
        Profile.hasMany(models.ProfileImage, { foreignKey: 'profileId' });
    };

    return Profile;
};