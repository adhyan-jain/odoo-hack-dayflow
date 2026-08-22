import React from 'react';
import { UserProfile } from '../../types';

interface ProfileViewProps {
  currentUser: UserProfile;
  onEditProfile: () => void;
  onOpenApplyLeave: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  currentUser,
  onEditProfile,
}) => {
  const isSarah = currentUser.id === 'usr-sarah';

  const handleDownloadDoc = (docName: string) => {
    alert(`Downloading ${docName}...`);
  };

  const handleShareProfile = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      alert('Profile link copied to clipboard!');
    }
  };

  return (
    <div id="profile-view" className="px-6 md:px-10 pb-16 max-w-6xl mx-auto w-full flex-1 flex flex-col gap-6">
      {/* Profile Header Card */}
      <div className="bg-[#FFFFFF] rounded-[24px] p-6 md:p-8 bento-shadow flex flex-col md:flex-row items-center md:items-start justify-between gap-6 border border-[#eeeeeb]">
        <div className="flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
          <div className="w-24 h-24 md:w-28 md:h-28 rounded-full overflow-hidden border-4 border-[#eeeeeb] shadow-sm shrink-0">
            <img
              src={currentUser.avatar}
              alt={currentUser.name}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-[#1a1c1b] tracking-tight">
              {currentUser.name}
            </h2>
            <p className="text-[#424844] text-sm md:text-base font-medium mt-1">
              {currentUser.title}
            </p>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mt-3">
              <span className="bg-[#eeeeeb] text-[#424844] px-3 py-1 rounded-full text-xs font-semibold">
                ID: {currentUser.employeeId}
              </span>
              <span className="bg-[#c8ead8]/40 text-[#436153] px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#436153]" />
                Active Employee
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleShareProfile}
            className="px-4 py-2.5 rounded-full border border-[#c1c8c3] text-[#1a1c1b] hover:bg-[#eeeeeb] text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">share</span>
            Share Profile
          </button>
          <button
            id="btn-edit-profile"
            onClick={onEditProfile}
            className="px-5 py-2.5 rounded-full bg-[#1a1c1b] text-[#ffffff] hover:bg-[#424844] text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer shadow-sm active:scale-95"
          >
            <span className="material-symbols-outlined text-[16px]">edit</span>
            Edit Profile
          </button>
        </div>
      </div>

      {/* 2x2 Bento Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Personal Details */}
        <div className="bg-[#FFFFFF] rounded-[20px] p-6 bento-shadow flex flex-col justify-between border border-[#eeeeeb]">
          <div>
            <div className="flex items-center gap-2.5 mb-5">
              <span className="material-symbols-outlined text-[#5b7a6b] text-[20px]">person</span>
              <h3 className="text-lg font-bold text-[#1a1c1b] tracking-tight">Personal Details</h3>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-xs text-[#625e52] font-semibold uppercase tracking-wider">
                  Email Address
                </p>
                <p className="text-sm font-medium text-[#1a1c1b] mt-0.5">{currentUser.email}</p>
              </div>

              <div>
                <p className="text-xs text-[#625e52] font-semibold uppercase tracking-wider">
                  Phone Number
                </p>
                <p className="text-sm font-medium text-[#1a1c1b] mt-0.5">{currentUser.phone}</p>
              </div>

              <div>
                <p className="text-xs text-[#625e52] font-semibold uppercase tracking-wider">
                  Home Address
                </p>
                <p className="text-sm font-medium text-[#1a1c1b] mt-0.5">{currentUser.address}</p>
              </div>

              <div>
                <p className="text-xs text-[#625e52] font-semibold uppercase tracking-wider">
                  Date of Birth
                </p>
                <p className="text-sm font-medium text-[#1a1c1b] mt-0.5">{currentUser.birthDate}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Job & Organization */}
        <div className="bg-[#FFFFFF] rounded-[20px] p-6 bento-shadow flex flex-col justify-between border border-[#eeeeeb]">
          <div>
            <div className="flex items-center gap-2.5 mb-5">
              <span className="material-symbols-outlined text-[#5b7a6b] text-[20px]">
                corporate_fare
              </span>
              <h3 className="text-lg font-bold text-[#1a1c1b] tracking-tight">
                Job &amp; Organization
              </h3>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-xs text-[#625e52] font-semibold uppercase tracking-wider">
                  Department
                </p>
                <p className="text-sm font-medium text-[#1a1c1b] mt-0.5">{currentUser.department}</p>
              </div>

              <div>
                <p className="text-xs text-[#625e52] font-semibold uppercase tracking-wider">
                  Reports To (Manager)
                </p>
                <div className="flex items-center gap-3 mt-1.5 p-2 bg-[#f4f4f1] rounded-xl">
                  <img
                    src={currentUser.manager.avatar}
                    alt={currentUser.manager.name}
                    className="w-8 h-8 rounded-full object-cover border border-[#c1c8c3]/40"
                    referrerPolicy="no-referrer"
                  />
                  <div>
                    <p className="text-sm font-semibold text-[#1a1c1b]">
                      {currentUser.manager.name}
                    </p>
                    <p className="text-xs text-[#625e52]">{currentUser.manager.title}</p>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-xs text-[#625e52] font-semibold uppercase tracking-wider">
                  Employment Type
                </p>
                <p className="text-sm font-medium text-[#1a1c1b] mt-0.5">
                  {currentUser.employmentType}
                </p>
              </div>

              <div>
                <p className="text-xs text-[#625e52] font-semibold uppercase tracking-wider">
                  Start Date &amp; Tenure
                </p>
                <p className="text-sm font-medium text-[#1a1c1b] mt-0.5">
                  {currentUser.joinDate} ({currentUser.tenure})
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: Compensation & Equity */}
        <div className="bg-[#FFFFFF] rounded-[20px] p-6 bento-shadow flex flex-col justify-between border border-[#eeeeeb]">
          <div>
            <div className="flex items-center gap-2.5 mb-5">
              <span className="material-symbols-outlined text-[#5b7a6b] text-[20px]">
                attach_money
              </span>
              <h3 className="text-lg font-bold text-[#1a1c1b] tracking-tight">
                Compensation &amp; Equity
              </h3>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-xs text-[#625e52] font-semibold uppercase tracking-wider">
                  Base Salary
                </p>
                <p className="text-lg font-bold text-[#1a1c1b] mt-0.5">
                  ${currentUser.salary.base.toLocaleString()} <span className="text-xs font-normal text-[#625e52]">/ year</span>
                </p>
              </div>

              <div>
                <p className="text-xs text-[#625e52] font-semibold uppercase tracking-wider">
                  Target Bonus
                </p>
                <p className="text-sm font-medium text-[#1a1c1b] mt-0.5">
                  {currentUser.salary.bonusPercent}% (Annual performance based)
                </p>
              </div>

              <div>
                <p className="text-xs text-[#625e52] font-semibold uppercase tracking-wider">
                  Stock Grants
                </p>
                <p className="text-sm font-medium text-[#1a1c1b] mt-0.5">
                  {currentUser.salary.equity.toLocaleString()} RSUs (Vested: {(currentUser.salary.equity / 2).toLocaleString()})
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 p-3 bg-[#e6dfd0]/40 rounded-xl flex items-center gap-2.5 text-[#676256] text-xs">
            <span className="material-symbols-outlined text-[18px]">lock</span>
            <span>Restricted view. Visible to HR &amp; Direct Manager.</span>
          </div>
        </div>

        {/* Card 4: Documents & Compliance */}
        <div className="bg-[#FFFFFF] rounded-[20px] p-6 bento-shadow flex flex-col justify-between border border-[#eeeeeb]">
          <div>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-[#5b7a6b] text-[20px]">
                  folder_open
                </span>
                <h3 className="text-lg font-bold text-[#1a1c1b] tracking-tight">
                  Documents &amp; Files
                </h3>
              </div>
            </div>

            <div className="space-y-2.5">
              <div
                onClick={() => handleDownloadDoc('Employment_Agreement_2021.pdf')}
                className="flex items-center justify-between p-3 rounded-xl bg-[#faf9f7] hover:bg-[#eeeeeb] transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-[#5b7a6b] text-[20px]">
                    description
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-[#1a1c1b]">
                      Employment_Agreement_{isSarah ? '2021' : '2022'}.pdf
                    </p>
                    <p className="text-xs text-[#625e52]">Signed • 1.2 MB</p>
                  </div>
                </div>
                <span className="material-symbols-outlined text-[#625e52] group-hover:text-[#1a1c1b] text-[18px]">
                  download
                </span>
              </div>

              <div
                onClick={() => handleDownloadDoc('Benefits_Enrollment_Summary.pdf')}
                className="flex items-center justify-between p-3 rounded-xl bg-[#faf9f7] hover:bg-[#eeeeeb] transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-[#5b7a6b] text-[20px]">
                    verified_user
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-[#1a1c1b]">
                      Benefits_Enrollment_Summary.pdf
                    </p>
                    <p className="text-xs text-[#625e52]">Verified • 480 KB</p>
                  </div>
                </div>
                <span className="material-symbols-outlined text-[#625e52] group-hover:text-[#1a1c1b] text-[18px]">
                  download
                </span>
              </div>

              <div
                onClick={() => handleDownloadDoc('2023_Tax_Withholding_W2.pdf')}
                className="flex items-center justify-between p-3 rounded-xl bg-[#faf9f7] hover:bg-[#eeeeeb] transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-[#5b7a6b] text-[20px]">
                    receipt_long
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-[#1a1c1b]">
                      2023_Tax_Withholding_W2.pdf
                    </p>
                    <p className="text-xs text-[#625e52]">Tax document • 250 KB</p>
                  </div>
                </div>
                <span className="material-symbols-outlined text-[#625e52] group-hover:text-[#1a1c1b] text-[18px]">
                  download
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() => alert('Select file to upload (PDF, PNG, DOCX up to 25MB)')}
            className="mt-6 w-full py-2.5 rounded-full border border-dashed border-[#c1c8c3] hover:border-[#5b7a6b] text-xs font-semibold text-[#424844] hover:text-[#5b7a6b] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">upload</span>
            Upload Document
          </button>
        </div>
      </div>
    </div>
  );
};
